import type { Prisma } from '@prisma/client'
import { GPT_CATEGORIES, gizmoIdOf, gptUrlOf, isGptCategory } from '#shared/gpts'

// GPT Store (/gpts) — "Submit GPT" works like Toolify's: the customer only pastes the
// GPT link and pays; we fetch the GPT's name, description and image from its public page.
//
//   checkout      → link must be a public GPT, not already listed / in review
//   paid order    → Gpt { status PENDING, fetchStatus QUEUED }, then the page is fetched
//   admin         → edits (category, text…), publishes   → PUBLISHED, on /gpts
//                   or rejects with a reason             → REJECTED, order refunded via Stripe
//                   can hide a published GPT again        → HIDDEN
// The customer follows it in Dashboard → My GPTs.

const bad = (message: string) => createError({ statusCode: 400, statusMessage: 'Bad Request', message })
const conflict = (message: string) => createError({ statusCode: 409, statusMessage: 'Conflict', message })

const BROWSER_HEADERS = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
  'accept-language': 'en-US,en;q=0.9',
  'accept': 'text/html,application/xhtml+xml'
}
// Hosts the GPT's picture may come from (the og:image of chatgpt.com pages).
const IMAGE_HOSTS = ['chatgpt.com', 'cdn.openai.com', 'files.oaiusercontent.com', 'chat.openai.com']
const MAX_PAGE_BYTES = 4 * 1024 * 1024
const MAX_ICON_BYTES = 2 * 1024 * 1024

function gptSlugify(s: string) {
  return s
    .replace(/[đĐ]/g, 'd')
    .normalize('NFKD').replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 60)
    .replace(/^-+|-+$/g, '')
}

async function uniqueGptSlug(db: Prisma.TransactionClient, base: string) {
  const root = gptSlugify(base) || 'gpt'
  for (let i = 1; ; i++) {
    const slug = i === 1 ? root : `${root}-${i}`
    if (!await db.gpt.findUnique({ where: { slug }, select: { id: true } })) return slug
  }
}

/* ------------------------------------------------------------------ */
/* Reading a GPT page                                                  */
/* ------------------------------------------------------------------ */

const decode = (s: string) => s
  .replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&amp;/g, '&')

function metaOf(html: string, property: string) {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]*>`, 'i')
  const tag = html.match(re)?.[0]
  const content = tag?.match(/content=["']([^"']*)["']/i)?.[1]
  return content ? decode(content).trim() : ''
}

export type GptPage =
  | { status: 'OK'; name: string; description: string; image: string | null }
  | { status: 'NOT_FOUND' }
  | { status: 'FAILED'; reason: string }

// The public page of a GPT. A link to a GPT that doesn't exist (or isn't public) answers
// 404, or the generic ChatGPT page whose title is just "ChatGPT".
const probeCache = new Map<string, { at: number; page: GptPage }>()
// A GPT that exists is remembered 10 minutes; "not found" only 1 minute, so a creator who
// just made their GPT public can buy again right away.
const PROBE_TTL = 10 * 60 * 1000
const PROBE_TTL_NOT_FOUND = 60 * 1000
async function probeGptPage(gizmoId: string): Promise<GptPage> {
  const hit = probeCache.get(gizmoId)
  if (hit && Date.now() - hit.at < (hit.page.status === 'NOT_FOUND' ? PROBE_TTL_NOT_FOUND : PROBE_TTL)) return hit.page
  const page = await readGptPage(gizmoId)
  if (page.status !== 'FAILED') {
    if (probeCache.size > 1000) probeCache.clear()
    probeCache.set(gizmoId, { at: Date.now(), page })
  }
  return page
}

export async function readGptPage(gizmoId: string): Promise<GptPage> {
  let res: Response
  try {
    res = await fetch(gptUrlOf(gizmoId), { headers: BROWSER_HEADERS, redirect: 'follow', signal: AbortSignal.timeout(15_000) })
  } catch (err: any) {
    return { status: 'FAILED', reason: err?.message ?? 'network error' }
  }
  if (res.status === 404) return { status: 'NOT_FOUND' }
  if (!res.ok) return { status: 'FAILED', reason: `HTTP ${res.status}` }
  const html = (await res.text()).slice(0, MAX_PAGE_BYTES)
  const title = metaOf(html, 'og:title') || (html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? '')
  const name = decode(title).replace(/^ChatGPT\s*[-–—:]\s*/i, '').trim()
  if (!name || /^ChatGPT$/i.test(name)) return { status: 'NOT_FOUND' }
  const image = metaOf(html, 'og:image')
  return { status: 'OK', name: name.slice(0, 120), description: metaOf(html, 'og:description').slice(0, 600), image: image || null }
}

// Copies the GPT's picture to our uploads (the chatgpt.com link is signed and expires).
async function saveGptIcon(gptId: string, imageUrl: string) {
  let u: URL
  try { u = new URL(imageUrl) } catch { return null }
  if (u.protocol !== 'https:' || !IMAGE_HOSTS.includes(u.hostname.toLowerCase())) return null
  try {
    const res = await fetch(u, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(15_000) })
    if (!res.ok) return null
    const data = Buffer.from(await res.arrayBuffer())
    if (data.length > MAX_ICON_BYTES) return null
    const image = detectImage(data)
    if (!image) return null
    return await saveImage(`gpts/${gptId.toLowerCase()}`, data, image.ext)
  } catch {
    return null
  }
}

// Fetches the GPT page and fills the listing. `overwrite`: replace what is there (the
// admin's "Fetch again"); otherwise only empty fields are filled, so edits survive.
export async function fetchGptInfo(id: string, overwrite = false) {
  const gpt = await prisma.gpt.findUnique({ where: { id } })
  if (!gpt) throw createError({ statusCode: 404, statusMessage: 'GPT not found' })
  const page: GptPage = gpt.gizmoId ? await readGptPage(gpt.gizmoId) : { status: 'NOT_FOUND' }
  if (page.status !== 'OK') {
    return prisma.gpt.update({ where: { id }, data: { fetchStatus: page.status, fetchedAt: new Date() } })
  }
  const icon = (overwrite || !gpt.iconUrl) && page.image ? await saveGptIcon(gpt.id, page.image) : null
  if (overwrite) {
    return prisma.gpt.update({
      where: { id },
      data: { fetchStatus: 'OK', fetchedAt: new Date(), name: page.name, description: page.description, ...(icon ? { iconUrl: icon } : {}) }
    })
  }
  // Only fields still empty *now* — the admin may have filled one while the page loaded.
  await prisma.$transaction([
    prisma.gpt.updateMany({ where: { id, name: '' }, data: { name: page.name } }),
    prisma.gpt.updateMany({ where: { id, description: '' }, data: { description: page.description } }),
    ...(icon ? [prisma.gpt.updateMany({ where: { id, iconUrl: null }, data: { iconUrl: icon } })] : [])
  ])
  return prisma.gpt.update({ where: { id }, data: { fetchStatus: 'OK', fetchedAt: new Date() } })
}

/* ------------------------------------------------------------------ */
/* Ordering                                                            */
/* ------------------------------------------------------------------ */

// Checkout: a valid GPT link, not already listed or waiting, and (when chatgpt.com
// answers) a GPT that exists. If chatgpt.com can't be reached the order still goes
// through — the admin sees the failed fetch and can retry or refund.
export async function assertGptSubmittable(link: unknown) {
  const gizmoId = gizmoIdOf(link)
  if (!gizmoId) throw bad('Enter a valid GPT link, e.g. https://chatgpt.com/g/g-abc123-my-gpt')
  const taken = await prisma.gpt.findFirst({ where: { gizmoId, status: { not: 'REJECTED' } }, select: { status: true } })
  if (taken) throw bad(taken.status === 'PENDING' ? 'This GPT has already been submitted and is waiting for review.' : 'This GPT is already listed.')
  const page = await probeGptPage(gizmoId)
  if (page.status === 'NOT_FOUND') throw bad('This GPT was not found. Make sure the link is right and the GPT is shared publicly.')
  return gizmoId
}

// Called from fulfillPromoteOrder (inside its transaction) for a paid submit-gpt order.
export async function createGptForOrder(tx: Prisma.TransactionClient, order: { id: string; userId: string; payload: Prisma.JsonValue }) {
  const link = String((order.payload as Record<string, unknown>)?.gptUrl ?? '').trim()
  const gizmoId = gizmoIdOf(link)
  const readable = link.match(/\/g\/g-[A-Za-z0-9]+-([\w-]+)/)?.[1] ?? gizmoId ?? 'gpt'
  const gpt = await tx.gpt.create({
    data: {
      slug: await uniqueGptSlug(tx, readable),
      // An unreadable link (older orders accepted any URL) is kept as is for the admin.
      gizmoId: gizmoId ?? '',
      url: gizmoId ? gptUrlOf(gizmoId) : link.slice(0, 2000),
      fetchStatus: gizmoId ? 'QUEUED' : 'NOT_FOUND',
      ownerId: order.userId,
      orderId: order.id
    },
    select: { id: true }
  })
  return gizmoId ? gpt.id : null
}

// Paid submit-gpt orders from before the GPT Store existed have no Gpt yet: create them
// (fetched in the background) the first time someone looks.
export async function ensureGptsForPaidOrders(userId?: string) {
  const orders = await prisma.promoteOrder.findMany({
    where: { type: 'submit-gpt', status: 'PAID', ...(userId ? { userId } : {}) },
    select: { id: true, userId: true, payload: true }
  })
  if (!orders.length) return
  const have = new Set((await prisma.gpt.findMany({ where: { orderId: { in: orders.map(o => o.id) } }, select: { orderId: true } })).map(g => g.orderId))
  for (const order of orders.filter(o => !have.has(o.id))) {
    const id = await prisma.$transaction(tx => createGptForOrder(tx, order)).catch(() => null)
    if (id) void fetchGptInfo(id).catch(() => {})
  }
}

/* ------------------------------------------------------------------ */
/* Admin                                                               */
/* ------------------------------------------------------------------ */

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

export function cleanGptInput(body: Record<string, unknown>) {
  const name = str(body.name)
  const description = str(body.description)
  const content = typeof body.content === 'string' ? body.content.replace(/\r\n/g, '\n').trim() : ''
  const iconUrl = str(body.iconUrl)
  const author = str(body.author)
  const category = str(body.category)
  if (name.length > 120) throw bad('The name is too long.')
  if (description.length > 600) throw bad('The description must be 600 characters or less.')
  if (content.length > 50_000) throw bad('The text is too long.')
  if (iconUrl && !isImageUrl(iconUrl)) throw bad('Invalid image.')
  if (author.length > 80) throw bad('The author name is too long.')
  if (!isGptCategory(category)) throw bad(`Category must be one of: ${GPT_CATEGORIES.join(', ')}.`)
  return { name, description, content: content || null, iconUrl: iconUrl || null, author: author || null, category }
}

// Refunds the order behind a rejected GPT. The idempotency key makes a retry return the
// same refund instead of a second one.
async function refundGptOrder(order: { id: string; stripeSessionId: string }, gptId: string) {
  if (order.stripeSessionId.startsWith('fake_')) return // dev FAKE_PAYMENT orders
  const stripe = useStripe()
  const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId)
  const paymentIntent = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id
  if (!paymentIntent) throw createError({ statusCode: 502, statusMessage: 'No payment to refund for this order' })
  await stripe.refunds.create({ payment_intent: paymentIntent }, { idempotencyKey: `gpt-reject-refund-${gptId}` })
}

export type GptAdminAction =
  | { action: 'publish' }
  | { action: 'hide' }
  | { action: 'refetch' }
  | { action: 'reject'; reason: string }

export async function adminGptAction(id: string, input: GptAdminAction) {
  const gpt = await prisma.gpt.findUnique({ where: { id } })
  if (!gpt) throw createError({ statusCode: 404, statusMessage: 'GPT not found' })

  switch (input.action) {
    case 'refetch':
      return fetchGptInfo(id, true)
    case 'publish': {
      if (gpt.status === 'REJECTED') throw conflict('A rejected GPT cannot be published.')
      if (!gpt.gizmoId) throw bad('This is not a GPT link — reject it instead.')
      if (gpt.name.length < 2 || gpt.description.length < 10) throw bad('Add a name and a description (10+ characters) before publishing.')
      const { count } = await prisma.gpt.updateMany({
        where: { id, status: { in: ['PENDING', 'HIDDEN'] }, updatedAt: gpt.updatedAt },
        data: { status: 'PUBLISHED', publishedAt: gpt.publishedAt ?? new Date(), rejectionReason: null }
      })
      if (count !== 1) throw conflict('This GPT changed meanwhile, please reload.')
      return { id, status: 'PUBLISHED' }
    }
    case 'hide': {
      const { count } = await prisma.gpt.updateMany({ where: { id, status: 'PUBLISHED' }, data: { status: 'HIDDEN' } })
      if (count !== 1) throw conflict('This GPT is not published.')
      return { id, status: 'HIDDEN' }
    }
    case 'reject': {
      if (!input.reason) throw bad('Give a reason.')
      // One transaction holding the GPT row: an admin publishing it meanwhile waits and then
      // finds it rejected. Stripe refunds inside it — if Stripe fails, nothing is marked and
      // the admin simply tries again (the idempotency key prevents a second refund).
      return prisma.$transaction(async (tx) => {
        const locked = await tx.$queryRaw<{ status: string }[]>`SELECT status FROM "Gpt" WHERE id = ${id} FOR UPDATE`
        if (locked[0]?.status !== 'PENDING') throw conflict('Only a GPT waiting for review can be rejected — hide a published one instead.')
        const order = gpt.orderId ? await tx.promoteOrder.findUnique({ where: { id: gpt.orderId } }) : null
        await tx.gpt.update({ where: { id }, data: { status: 'REJECTED', rejectionReason: input.reason } })
        if (order?.status === 'PAID') {
          await tx.promoteOrder.update({ where: { id: order.id }, data: { status: 'REFUNDED' } })
          try {
            await refundGptOrder(order, gpt.id)
          } catch (err: any) {
            if (isError(err)) throw err
            throw createError({ statusCode: 502, statusMessage: 'Stripe refund failed', message: `Refund failed: ${err?.message ?? 'unknown error'}` })
          }
        }
        return { id, status: 'REJECTED', refunded: order?.status === 'PAID' }
      }, { timeout: 30_000, maxWait: 10_000 })
    }
    default:
      throw bad('Unknown action.')
  }
}

/* ------------------------------------------------------------------ */
/* Public                                                              */
/* ------------------------------------------------------------------ */

export const gptCardSelect = {
  slug: true, name: true, description: true, iconUrl: true, author: true, category: true, url: true, publishedAt: true
} satisfies Prisma.GptSelect
