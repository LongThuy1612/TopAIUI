// POST /api/promote/checkout
// Nhận đơn từ các trang promote, kiểm tra lại giá ở server (không tin số tiền
// từ client), tạo đơn PENDING + phiên Stripe Checkout rồi trả về checkoutUrl.
// Việc ghi nhận thanh toán do webhook /api/stripe/webhook làm.
// FAKE_PAYMENT=true (chỉ dùng khi dev): bỏ qua Stripe, coi như đã trả tiền
// và chạy luôn fulfillPromoteOrder như webhook.
import { randomUUID } from 'node:crypto'
import type { Prisma } from '@prisma/client'
import {
  submitAi, submitGpt, updateAi, advertise, creditTotal, MAX_CREDITS_PER_ORDER
} from '#shared/promote'

type Body =
  | { type: 'submit-ai'; name: string; url: string; mode: 'auto' | 'manual' }
  | { type: 'advertise'; toolId: string; tier: 'STANDARD' | 'FEATURED'; landingUrl?: string; clicks: number }
  | { type: 'guest-post'; credits: number }
  | { type: 'update-ai'; toolId: string }
  | { type: 'submit-gpt'; gptUrl: string }

// Trang mà Stripe đưa người dùng quay về sau khi trả / huỷ.
const returnPath: Record<Body['type'], string> = {
  'submit-ai': '/submit',
  'advertise': '/advertise',
  'guest-post': '/post-or-insert',
  'update-ai': '/update-ai',
  'submit-gpt': '/submit-gpt'
}

const isUrl = (s: unknown) => {
  try { return ['http:', 'https:'].includes(new URL(String(s)).protocol) } catch { return false }
}

const bad = (message: string) => createError({ statusCode: 400, statusMessage: 'Bad Request', message })

async function requireTool(toolId: unknown) {
  if (typeof toolId !== 'string' || !toolId) throw bad('Tool is required.')
  const tool = await prisma.tool.findFirst({
    where: { id: toolId, status: 'PUBLISHED', deletedAt: null },
    select: { id: true, name: true }
  })
  if (!tool) throw bad('Tool not found.')
  return tool
}

// Trả về số tiền (USD), tên hiển thị trên Stripe và payload đã được làm sạch để lưu.
async function priceOf(b: Body, userId: string): Promise<{ amount: number; label: string; payload: Prisma.InputJsonObject }> {
  switch (b?.type) {
    case 'submit-ai': {
      const name = String(b.name ?? '').trim()
      if (!name || !isUrl(b.url)) throw bad('Invalid tool name or URL.')
      if (name.length > 120 || String(b.url).trim().length > 2000) throw bad('Tool name or URL is too long.')
      const existing = await findDuplicateTool(String(b.url))
      if (existing) throw bad(`This website is already listed as "${existing.name}".`)
      if (await findPendingSubmission(String(b.url), userId)) throw bad('This website is already being submitted by someone else.')
      const mode = b.mode === 'manual' ? 'manual' : 'auto'
      const url = String(b.url).trim()
      return { amount: submitAi.price, label: `Submit AI: ${name}`, payload: { name, url, mode, siteKey: siteKeyOf(url) } }
    }
    case 'submit-gpt': {
      // A real, public GPT that isn't listed or waiting already (server/utils/gpts.ts).
      await assertGptSubmittable(b.gptUrl)
      return { amount: submitGpt.price, label: 'Submit GPT', payload: { gptUrl: String(b.gptUrl).trim() } }
    }
    case 'update-ai': {
      // Only the owner can buy an update, for their own published tool, one at a time.
      const tool = await requireTool(b.toolId)
      const owned = await prisma.tool.findFirst({ where: { id: tool.id, ownerId: userId }, select: { id: true } })
      if (!owned) throw bad('You can only update a tool you own.')
      if (await findOpenUpdate(tool.id)) throw bad('This tool already has an update in progress.')
      return { amount: updateAi.price, label: `Update AI: ${tool.name}`, payload: { toolId: tool.id, toolName: tool.name } }
    }
    case 'advertise': {
      if (!isAdTier(b.tier)) throw bad('Invalid ad type.')
      const pkg = advertise.packages[b.tier].find(p => p.clicks === Number(b.clicks))
      if (!pkg) throw bad('Invalid package.')
      if (b.landingUrl && (!isUrl(b.landingUrl) || String(b.landingUrl).trim().length > 2000)) throw bad('Invalid landing URL.')
      const tool = await requireTool(b.toolId)
      // Paying into a campaign our team stopped would only strand the money.
      const held = await prisma.adCampaign.findFirst({
        where: { userId, toolId: tool.id, tier: b.tier, status: 'PAUSED', pausedByAdmin: true },
        select: { id: true }
      })
      if (held) throw bad('This campaign was paused by our team. Please contact us before buying more clicks.')
      const tierLabel = b.tier === 'FEATURED' ? 'Featured' : 'Standard'
      return {
        amount: +(pkg.clicks * pkg.costPerClick).toFixed(2),
        label: `Advertise ${tool.name} (${tierLabel}): ${pkg.clicks.toLocaleString('en-US')} clicks`,
        payload: { toolId: tool.id, toolName: tool.name, tier: b.tier, clicks: pkg.clicks, landingUrl: b.landingUrl?.trim() || null }
      }
    }
    case 'guest-post': {
      const credits = Number(b.credits)
      if (!Number.isInteger(credits) || credits < 1 || credits > MAX_CREDITS_PER_ORDER) throw bad('Invalid credits.')
      return {
        amount: creditTotal(credits),
        label: `${credits} guest post / link insert credit${credits > 1 ? 's' : ''}`,
        payload: { credits }
      }
    }
    default:
      throw bad('Unknown order type.')
  }
}

export default defineEventHandler(async (event) => {
  const userId = requireUser(event)
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.isBanned || user.deletedAt) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody<Body>(event)
  const { amount, label, payload } = await priceOf(body, user.id)
  const amountCents = Math.round(amount * 100)

  // Dev builds only: a production server never skips payment, whatever the env says.
  if (import.meta.dev && useRuntimeConfig().fakePayment) {
    const order = await prisma.promoteOrder.create({
      data: { userId: user.id, type: body.type, payload, stripeSessionId: `fake_${randomUUID()}`, amount: amountCents }
    })
    const paid = await fulfillPromoteOrder(order.stripeSessionId)
    return {
      orderId: order.id,
      // A new tool / an update goes straight to the tool's page, ads to the campaign list;
      // everything else to the order list.
      redirect: body.type === 'advertise'
        ? '/dashboard/advertise'
        : paid?.toolId ? `/dashboard/my-ais/${paid.toolId}` : `/orders?new=${order.id}`
    }
  }

  const stripe = useStripe()
  const { public: { siteUrl } } = useRuntimeConfig()
  const back = `${siteUrl}${returnPath[body.type]}`

  const createSession = (customerId: string | null) => stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{
      quantity: 1,
      price_data: { currency: 'usd', unit_amount: amountCents, product_data: { name: label } }
    }],
    ...(customerId
      ? { customer: customerId }
      : { customer_email: user.email, customer_creation: 'always' as const }),
    client_reference_id: user.id,
    metadata: { userId: user.id, type: body.type },
    success_url: `${back}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${back}?canceled=1`
  })

  let session: Awaited<ReturnType<typeof createSession>>
  try {
    session = await createSession(user.stripeCustomerId)
  } catch (err) {
    // A saved customer id stops existing when switching Stripe accounts or
    // test ↔ live keys. Forget it and let Checkout create a fresh customer.
    const e = err as { code?: string; param?: string }
    if (!user.stripeCustomerId || e.code !== 'resource_missing' || e.param !== 'customer') throw err
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: null } })
    session = await createSession(null)
  }

  try {
    const order = await prisma.promoteOrder.create({
      data: { userId: user.id, type: body.type, payload, stripeSessionId: session.id, amount: amountCents }
    })
    return { orderId: order.id, checkoutUrl: session.url }
  } catch (err) {
    // Without an order row the webhook could not record the payment, so
    // never hand out a session that cannot be fulfilled.
    await stripe.checkout.sessions.expire(session.id).catch(() => {})
    throw err
  }
})
