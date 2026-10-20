import type { Prisma } from '@prisma/client'
import type { H3Event } from 'h3'
import { createHmac } from 'node:crypto'
import { isError } from 'h3'
import { advertise, type AdTier } from '#shared/promote'

// Pay-per-click ads (model AdCampaign). One campaign per user + tool + tier; its balance
// is clicksRemaining.
//
//   paid advertise order → applyAdOrder: new campaign, or a top-up of the existing one
//     STANDARD + landing on the tool's own site → ACTIVE
//     FEATURED, or a landing URL on another site → PENDING_REVIEW → admin approves (ACTIVE)
//                                                  or rejects (REJECTED, every order refunded)
//   landing URL changed while running → keeps running on the approved URL; the new one
//     waits in pendingLandingUrl when it needs a review (same rule as above)
//   sponsored slot clicked → chargeAdClick: one click off the balance, 0 → EXHAUSTED
//   top-up of an EXHAUSTED campaign → ACTIVE again
//
// Tool.isAd / adPriority mirror the running campaigns (syncToolAd) so the "Sponsor"
// badge and sort=featured keep working off the tool row.

type Db = Prisma.TransactionClient | typeof prisma

// categories: the /categories directory, one slot under each group.
export const AD_PLACEMENTS = ['home', 'today', 'new', 'most-featured', 'category', 'categories', 'tool', 'ranking', 'bar'] as const
export type AdPlacement = (typeof AD_PLACEMENTS)[number]

const conflict = (message: string) => createError({ statusCode: 409, statusMessage: message, message })

export const isAdTier = (v: unknown): v is AdTier => v === 'STANDARD' || v === 'FEATURED'

function hostOf(url: string | null | undefined) {
  try { return new URL(String(url)).hostname.toLowerCase().replace(/^www\./, '') } catch { return null }
}

// app.x.com and x.com count as one site; x.com and x.com.evil.io don't.
export function sameSite(a: string | null | undefined, b: string | null | undefined) {
  const ha = hostOf(a)
  const hb = hostOf(b)
  if (!ha || !hb) return false
  return ha === hb || ha.endsWith(`.${hb}`) || hb.endsWith(`.${ha}`)
}

// Featured always goes past an admin; standard only when it points away from the tool's site.
// No landing URL = the tool's own website.
export function landingNeedsReview(tier: AdTier, landingUrl: string | null, toolWebsite: string | null) {
  if (tier === 'FEATURED') return true
  return !!landingUrl && !sameSite(landingUrl, toolWebsite)
}

// Where a click on the campaign goes, tagged so the advertiser can see it in their analytics.
export function adTargetUrl(landingUrl: string | null, toolWebsite: string | null) {
  const safe = safeHttpUrl(landingUrl) ?? safeHttpUrl(toolWebsite)
  if (!safe) return null
  const url = new URL(safe)
  if (!url.searchParams.has('utm_source')) {
    url.searchParams.set('utm_source', 'topaicollection')
    url.searchParams.set('utm_medium', 'sponsored')
  }
  return url.href
}

// Keeps Tool.isAd / adPriority in step with the tool's running campaigns. Featured ranks
// above standard, then the larger remaining balance.
export async function syncToolAd(db: Db, toolId: string) {
  const running = await db.adCampaign.findMany({
    where: { toolId, status: 'ACTIVE', clicksRemaining: { gt: 0 } },
    select: { tier: true, clicksRemaining: true }
  })
  const remaining = running.reduce((sum, c) => sum + c.clicksRemaining, 0)
  const featured = running.some(c => c.tier === 'FEATURED')
  await db.tool.update({
    where: { id: toolId },
    data: {
      isAd: running.length > 0,
      adPriority: running.length ? (featured ? 1_000_000 : 0) + Math.min(remaining, 999_999) : 0
    }
  })
}

// Status a campaign goes back to when it is allowed to run.
const runningStatus = (clicksRemaining: number) => (clicksRemaining > 0 ? 'ACTIVE' : 'EXHAUSTED')

// Called from fulfillPromoteOrder (inside its transaction) for a paid advertise order.
export async function applyAdOrder(tx: Prisma.TransactionClient, order: { id: string; userId: string; payload: unknown }) {
  const payload = order.payload as Record<string, unknown>
  const toolId = String(payload.toolId ?? '')
  const tier: AdTier = isAdTier(payload.tier) ? payload.tier : 'STANDARD' // orders from before tiers
  const clicks = Number(payload.clicks) || 0
  const landingUrl = typeof payload.landingUrl === 'string' && payload.landingUrl ? payload.landingUrl : null

  const tool = await tx.tool.findUniqueOrThrow({ where: { id: toolId }, select: { website: true } })
  // Lock the campaign row first, so an admin rejecting (and refunding) it at the same
  // moment either finishes before this top-up reads it or sees the new order afterwards.
  await tx.$queryRaw`SELECT "id" FROM "AdCampaign" WHERE "userId" = ${order.userId} AND "toolId" = ${toolId} AND "tier" = ${tier} FOR UPDATE`
  const existing = await tx.adCampaign.findUnique({ where: { userId_toolId_tier: { userId: order.userId, toolId, tier } } })

  let campaignId: string
  if (!existing || existing.status === 'REJECTED') {
    // A fresh start (a rejected campaign's orders were all refunded).
    const review = landingNeedsReview(tier, landingUrl, tool.website)
    const data = {
      status: review ? 'PENDING_REVIEW' : 'ACTIVE',
      landingUrl,
      pendingLandingUrl: null,
      rejectionReason: null,
      pausedByAdmin: false,
      clicksPurchased: clicks,
      clicksRemaining: clicks,
      clicks: 0,
      impressions: 0,
      approvedAt: review ? null : new Date()
    }
    const campaign = existing
      ? await tx.adCampaign.update({ where: { id: existing.id }, data })
      : await tx.adCampaign.create({ data: { ...data, userId: order.userId, toolId, tier } })
    campaignId = campaign.id
  } else {
    const remaining = existing.clicksRemaining + clicks
    await tx.adCampaign.update({
      where: { id: existing.id },
      data: {
        clicksPurchased: { increment: clicks },
        clicksRemaining: { increment: clicks },
        ...(existing.status === 'EXHAUSTED' ? { status: runningStatus(remaining) } : {}),
        // Left blank on the order = keep the current landing URL.
        ...(landingUrl && landingUrl !== existing.landingUrl ? landingChange({ ...existing, clicksRemaining: remaining }, tier, landingUrl, tool.website) : {})
      }
    })
    campaignId = existing.id
  }

  await syncToolAd(tx, toolId)
  return { toolId, campaignId }
}

// The fields to write when a campaign's landing URL changes. Before its first approval
// the URL is simply replaced (it is reviewed anyway); afterwards a change that needs a
// review waits in pendingLandingUrl while the approved one keeps running.
function landingChange(
  campaign: { status: string; landingUrl: string | null; clicksRemaining: number },
  tier: AdTier,
  landingUrl: string | null,
  toolWebsite: string | null
) {
  // A new URL replaces the reason an earlier one was turned down.
  if (campaign.status === 'PENDING_REVIEW') {
    // A standard campaign only waits because of its URL: back on the tool's site, it goes live.
    const live = !landingNeedsReview(tier, landingUrl, toolWebsite)
    return {
      landingUrl,
      pendingLandingUrl: null,
      rejectionReason: null,
      ...(live ? { status: runningStatus(campaign.clicksRemaining), approvedAt: new Date() } : {})
    }
  }
  // Back to the tool's own (listed) website: nothing new to review, for either tier.
  // (Through the review branch below this would become "pendingLandingUrl: null",
  // which means "nothing pending" — the request would silently do nothing.)
  if (!landingUrl) return { landingUrl: null, pendingLandingUrl: null, rejectionReason: null }
  if (landingNeedsReview(tier, landingUrl, toolWebsite)) {
    // Asking to go back to the approved URL just withdraws the pending change.
    return landingUrl === campaign.landingUrl ? { pendingLandingUrl: null } : { pendingLandingUrl: landingUrl, rejectionReason: null }
  }
  return { landingUrl, pendingLandingUrl: null, rejectionReason: null }
}

/* ------------------------------------------------------------------ */
/* Owner actions (dashboard)                                           */
/* ------------------------------------------------------------------ */

async function ownCampaign(userId: string, id: string) {
  const campaign = await prisma.adCampaign.findFirst({
    where: { id, userId },
    include: { tool: { select: { website: true } } }
  })
  if (!campaign) throw createError({ statusCode: 404, statusMessage: 'Campaign not found' })
  return campaign
}

export async function updateOwnCampaign(userId: string, id: string, input: { landingUrl?: string | null; paused?: boolean }) {
  const campaign = await ownCampaign(userId, id)
  if (campaign.status === 'REJECTED') throw conflict('This campaign was rejected.')
  const data: Prisma.AdCampaignUpdateInput = {}

  if (input.landingUrl !== undefined) {
    Object.assign(data, landingChange(campaign, campaign.tier as AdTier, input.landingUrl, campaign.tool.website))
  }
  if (input.paused === true) {
    if (!['ACTIVE', 'EXHAUSTED'].includes(campaign.status)) throw conflict('Only a running campaign can be paused.')
    data.status = 'PAUSED'
  } else if (input.paused === false) {
    if (campaign.status !== 'PAUSED') throw conflict('This campaign is not paused.')
    if (campaign.pausedByAdmin) throw conflict('This campaign was paused by an admin. Please contact us.')
    data.status = runningStatus(campaign.clicksRemaining)
  }

  return prisma.$transaction(async (tx) => {
    // Re-check the status inside the write: a click may have exhausted the campaign since.
    const { count } = await tx.adCampaign.updateMany({ where: { id, status: campaign.status }, data: data as Prisma.AdCampaignUpdateManyMutationInput })
    if (count !== 1) throw conflict('The campaign changed meanwhile, please reload.')
    await syncToolAd(tx, campaign.toolId)
    return { id }
  })
}

/* ------------------------------------------------------------------ */
/* Admin actions                                                       */
/* ------------------------------------------------------------------ */

// What the admin looked at when deciding. The owner can change the URL at any time, so an
// approval only goes through while the campaign still points where the admin saw it.
export interface ReviewedUrls { landingUrl: string | null; pendingLandingUrl: string | null }

export type AdminAdAction =
  | { action: 'approve'; seen: ReviewedUrls }
  | { action: 'reject'; reason: string }
  | { action: 'pause' }
  | { action: 'resume' }
  | { action: 'addClicks'; clicks: number }

// Refunds one paid order of a rejected campaign. The idempotency key makes a retry
// return the same refund instead of a second one.
async function refundAdOrder(order: RefundableOrder) {
  if (order.stripeSessionId.startsWith('fake_')) return // dev FAKE_PAYMENT orders
  if (order.provider === 'paypal') return void await refundPaypalOrder(order, `ad-reject-refund-${order.id}`)
  const stripe = useStripe()
  const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId)
  const paymentIntent = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id
  if (!paymentIntent) throw createError({ statusCode: 502, statusMessage: 'No payment to refund for this order' })
  await stripe.refunds.create({ payment_intent: paymentIntent }, { idempotencyKey: `ad-reject-refund-${order.id}` })
}

export async function adminAdAction(id: string, input: AdminAdAction) {
  const campaign = await prisma.adCampaign.findUnique({ where: { id } })
  if (!campaign) throw createError({ statusCode: 404, statusMessage: 'Campaign not found' })
  const data: Prisma.AdCampaignUpdateManyMutationInput = {}
  // Extra conditions for the final write (see ReviewedUrls).
  let where: Prisma.AdCampaignWhereInput = {}
  // The final write normally only goes through if nothing changed the status meanwhile.
  let statusWhere: Prisma.AdCampaignWhereInput['status'] = campaign.status

  switch (input.action) {
    case 'approve':
      where = { landingUrl: input.seen.landingUrl, pendingLandingUrl: input.seen.pendingLandingUrl }
      if (campaign.landingUrl !== input.seen.landingUrl || campaign.pendingLandingUrl !== input.seen.pendingLandingUrl) {
        throw conflict('The landing URL changed since you opened this page, please reload and review again.')
      }
      if (campaign.status === 'PENDING_REVIEW') {
        Object.assign(data, { status: runningStatus(campaign.clicksRemaining), approvedAt: new Date(), rejectionReason: null })
      } else if (campaign.pendingLandingUrl) {
        Object.assign(data, { landingUrl: campaign.pendingLandingUrl, pendingLandingUrl: null, rejectionReason: null })
      } else {
        throw conflict('Nothing is waiting for review on this campaign.')
      }
      break
    case 'reject':
      if (campaign.status === 'PENDING_REVIEW') {
        // Never ran, so every paid order behind it goes back. Refund first: if Stripe
        // fails, nothing is marked and the admin can simply try again.
        const orders = await prisma.promoteOrder.findMany({ where: { campaignId: id, status: 'PAID' }, select: refundableOrderSelect })
        for (const order of orders) {
          try {
            await refundAdOrder(order)
          } catch (err: any) {
            if (isError(err)) throw err
            throw createError({ statusCode: 502, statusMessage: 'Stripe refund failed', message: `Refund failed: ${err?.message ?? 'unknown error'}` })
          }
          await prisma.promoteOrder.update({ where: { id: order.id }, data: { status: 'REFUNDED' } })
        }
        Object.assign(data, { status: 'REJECTED', rejectionReason: input.reason, clicksRemaining: 0, clicksPurchased: 0 })
        // The money is back with the advertiser now, so the campaign must end rejected even
        // if it moved on during the refunds (the owner switched to their own site and it
        // went live, or another admin approved it) — else it would run on refunded clicks.
        statusWhere = { not: 'REJECTED' }
      } else if (campaign.pendingLandingUrl) {
        // Only the URL change is refused; the campaign keeps running on the approved URL.
        Object.assign(data, { pendingLandingUrl: null, rejectionReason: input.reason })
      } else {
        throw conflict('Nothing is waiting for review on this campaign.')
      }
      break
    case 'pause':
      if (!['ACTIVE', 'EXHAUSTED', 'PAUSED'].includes(campaign.status)) throw conflict('Only a running campaign can be paused.')
      Object.assign(data, { status: 'PAUSED', pausedByAdmin: true })
      break
    case 'resume':
      if (campaign.status !== 'PAUSED') throw conflict('This campaign is not paused.')
      Object.assign(data, { status: runningStatus(campaign.clicksRemaining), pausedByAdmin: false })
      break
    case 'addClicks': {
      const clicks = Number(input.clicks)
      if (!Number.isInteger(clicks) || clicks < 1 || clicks > 1_000_000) throw createError({ statusCode: 400, statusMessage: 'Invalid clicks' })
      Object.assign(data, {
        clicksPurchased: { increment: clicks },
        clicksRemaining: { increment: clicks },
        ...(campaign.status === 'EXHAUSTED' ? { status: 'ACTIVE' } : {})
      })
      break
    }
    default:
      throw createError({ statusCode: 400, statusMessage: 'Unknown action' })
  }

  return prisma.$transaction(async (tx) => {
    const { count } = await tx.adCampaign.updateMany({ where: { ...where, id, status: statusWhere }, data })
    if (count !== 1) throw conflict('The campaign changed meanwhile, please reload.')
    // A payment that arrived while refunding the others would be lost with the campaign:
    // roll back instead, so retrying the rejection refunds it too.
    if (input.action === 'reject' && campaign.status === 'PENDING_REVIEW' &&
      await tx.promoteOrder.count({ where: { campaignId: id, status: 'PAID' } })) {
      throw conflict('A new payment arrived for this campaign, please reject again to refund it too.')
    }
    await syncToolAd(tx, campaign.toolId)
    return { id }
  })
}

/* ------------------------------------------------------------------ */
/* Serving                                                             */
/* ------------------------------------------------------------------ */

// How often a campaign is shown, against others of its tier: the square root of its
// remaining clicks. A bigger balance still shows more (50,000 left ≈ 10× a 500 one), but
// can't crowd small advertisers out the way the raw balance would (100×).
const adWeight = (c: { clicksRemaining: number }) => Math.sqrt(c.clicksRemaining)

// One item drawn at random, proportionally to its weight.
function drawOne<T>(items: T[], weight: (item: T) => number) {
  const total = items.reduce((sum, it) => sum + weight(it), 0)
  let r = Math.random() * total
  for (const it of items) if ((r -= weight(it)) < 0) return it
  return items[items.length - 1]!
}

// The most slots one request may take. One request per page, so a tool is never
// advertised twice on it: home = its feed (slotPositions) + the "Just Launched" block,
// tool page = the banner above the reviews + the one over the alternatives.
const MAX_SLOTS: Partial<Record<AdPlacement, number>> = {
  bar: 1,
  home: advertise.slotPositions.length,
  tool: 2,
  // A category's page: one banner in the /category/all grid, or the side column's list.
  category: 8,
  categories: 40
}

// Up to `limit` (at most MAX_SLOTS) sponsored tools for one page (the sponsor bar: one
// featured). Mixes Featured (advertise.featuredShare of the slots) and Standard, weighted by
// the square root of the remaining clicks. `exclude`: a tool slug never to advertise here (on a tool's
// own detail page, its own ad would be pointless).
// Featured fills first, standard takes the slots left; one slot per tool.
export async function pickAdSlots(placement: AdPlacement, opts: { category?: string; exclude?: string; locale: string; limit?: number }) {
  const campaigns = await prisma.adCampaign.findMany({
    where: {
      status: 'ACTIVE',
      clicksRemaining: { gt: 0 },
      ...(placement === 'bar' ? { tier: 'FEATURED' } : {}),
      tool: {
        status: 'PUBLISHED',
        deletedAt: null,
        ...(opts.exclude ? { slug: { not: opts.exclude } } : {}),
        // On a category page, only tools of that category (a group: of any category under it).
        ...(placement === 'category' && opts.category ? { categories: { some: { slug: { in: await categoryFilterSlugs(opts.category) } } } } : {})
      }
    },
    select: { id: true, tier: true, toolId: true, clicksRemaining: true }
  })

  // Each slot: Featured with probability advertise.featuredShare (Standard otherwise) while
  // both tiers have campaigns left; then a tool of that tier, weighted by the sum of its
  // campaigns' weights; then one of that tool's campaigns, by weight — so a tool advertised
  // by two users (or twice) shows both, each in proportion. One slot per tool per page.
  type Pick = (typeof campaigns)[number]
  const byTool = (tier: string) => {
    const map = new Map<string, Pick[]>()
    for (const c of campaigns.filter(c => c.tier === tier)) map.set(c.toolId, [...(map.get(c.toolId) ?? []), c])
    return map
  }
  const pools = { FEATURED: byTool('FEATURED'), STANDARD: byTool('STANDARD') }
  const max = MAX_SLOTS[placement] ?? advertise.slotPositions.length
  const slots = Math.min(max, Math.max(1, Math.floor(opts.limit ?? max)))
  const usedTools = new Set<string>()
  const picked: Pick[] = []
  for (let i = 0; i < slots; i++) {
    const left = (tier: 'FEATURED' | 'STANDARD') => [...pools[tier]].filter(([toolId]) => !usedTools.has(toolId))
    const featured = left('FEATURED')
    const standard = left('STANDARD')
    if (!featured.length && !standard.length) break
    const tierPool = !standard.length ? featured : !featured.length ? standard : (Math.random() < advertise.featuredShare ? featured : standard)
    const [toolId, toolCampaigns] = drawOne(tierPool, ([, cs]) => cs.reduce((sum, c) => sum + adWeight(c), 0))
    usedTools.add(toolId)
    picked.push(drawOne(toolCampaigns, adWeight))
  }
  // Featured slots first (top of the home feed, the first banner of a page).
  picked.sort((a, b) => (a.tier === b.tier ? 0 : a.tier === 'FEATURED' ? -1 : 1))
  if (!picked.length) return []

  const tools = await prisma.tool.findMany({
    where: { id: { in: picked.map(c => c.toolId) } },
    select: {
      id: true, slug: true, name: true, logoUrl: true, pricingType: true,
      categories: { select: { slug: true, name: true, translations: { select: { locale: true, name: true } } } },
      tags: { select: { slug: true, translations: { select: { locale: true, name: true } } } },
      translations: { select: { locale: true, shortDesc: true } }
    }
  })
  const byId = new Map(tools.map(tool => [tool.id, tool]))

  return picked.flatMap((c) => {
    const tool = byId.get(c.toolId)
    if (!tool) return []
    const { translations, categories, tags, ...rest } = tool
    return [{
      campaignId: c.id,
      tier: c.tier as AdTier,
      clickUrl: `/api/ads/click/${c.id}?p=${placement}`,
      tool: {
        ...rest,
        isAd: true,
        logoUrl: resolveToolImage(rest.logoUrl),
        shortDesc: cleanText(pickByLocale(translations, opts.locale)?.shortDesc),
        categories: categories.map(cat => ({ slug: cat.slug, name: cleanText(pickByLocale(cat.translations, opts.locale)?.name) ?? cleanText(cat.name) ?? cat.slug })),
        tags: tags.map(tg => ({ slug: tg.slug, name: cleanText(pickByLocale(tg.translations, opts.locale)?.name) ?? tg.slug }))
      }
    }]
  })
}

export async function countAdImpressions(ids: string[]) {
  const campaigns = await prisma.adCampaign.findMany({ where: { id: { in: ids } }, select: { id: true, toolId: true } })
  if (!campaigns.length) return
  await prisma.$transaction([
    prisma.adCampaign.updateMany({ where: { id: { in: campaigns.map(c => c.id) } }, data: { impressions: { increment: 1 } } }),
    prisma.tool.updateMany({ where: { id: { in: campaigns.map(c => c.toolId) } }, data: { impressions: { increment: 1 } } })
  ])
}

/* ------------------------------------------------------------------ */
/* Clicks                                                              */
/* ------------------------------------------------------------------ */

const BOT_UA = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|curl|wget|python|axios|node-fetch|go-http|java\/|okhttp|scrapy/i
// A request from a person's browser, not a crawler or script (by user agent). Also used by
// Hot this week and Popular searches, which count what people do.
export function isHumanRequest(event: H3Event) {
  const ua = getHeader(event, 'user-agent') ?? ''
  return !!ua && !BOT_UA.test(ua)
}

const REPEAT_WINDOW_MS = 24 * 60 * 60 * 1000

// The visitor's IP. X-Forwarded-For is written by the client unless a proxy of ours
// overwrites it, so it is only trusted with NUXT_TRUST_PROXY=true — and then only its
// last hop, the one our proxy appended (the earlier ones are still the client's word).
// Without that anyone could drain a campaign by sending a new fake IP with every click.
export function visitorIp(event: H3Event) {
  if (useRuntimeConfig().trustProxy) {
    const hops = (getHeader(event, 'x-forwarded-for') ?? '').split(',').map(h => h.trim()).filter(Boolean)
    if (hops.length) return hops[hops.length - 1]!
  }
  return getRequestIP(event) ?? ''
}

// One visitor = one IPv4 address, or one IPv6 /64: an IPv6 device rotates through
// addresses of its /64 (privacy extensions), which would otherwise count as new visitors.
export function visitorKey(ip: string) {
  const v4 = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)
  if (v4) return v4[1]!
  if (!ip.includes(':')) return ip
  const [head = '', tail = ''] = ip.toLowerCase().split('%')[0]!.split('::')
  const left = head ? head.split(':') : []
  const right = tail ? tail.split(':') : []
  const groups = ip.includes('::') ? [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill('0'), ...right] : left
  return `${groups.slice(0, 4).map(g => g.replace(/^0+(?=.)/, '')).join(':')}::/64`
}

// Hashed so the click log (and the contact form's rate limit) never holds raw IPs.
export const hashIp = (ip: string) => createHmac('sha256', useRuntimeConfig().userTokenSecret).update(visitorKey(ip)).digest('hex').slice(0, 32)

// Records a click on a sponsored slot and returns where to send the visitor. Charged only
// for a live campaign with balance, a browser-looking visitor and the first click from
// that IP in 24h; everything else is logged with charged = false.
export async function chargeAdClick(campaignId: string, visitor: { ip: string; userAgent: string; placement: string | null }) {
  const campaign = await prisma.adCampaign.findUnique({
    where: { id: campaignId },
    include: { tool: { select: { website: true, slug: true, status: true, deletedAt: true } } }
  })
  if (!campaign) return null
  // landingUrl is only approved once the campaign has run; before that (or after a
  // rejection) send people to the listed website, so an unreviewed URL can't borrow our
  // domain as a redirect.
  const approved = ['ACTIVE', 'PAUSED', 'EXHAUSTED'].includes(campaign.status)
  const target = adTargetUrl(approved ? campaign.landingUrl : null, campaign.tool.website) ?? `/tools/${campaign.tool.slug}`

  const ipHash = hashIp(visitor.ip || 'unknown')
  const live = campaign.status === 'ACTIVE' && campaign.clicksRemaining > 0 &&
    campaign.tool.status === 'PUBLISHED' && !campaign.tool.deletedAt
  const human = !!visitor.userAgent && !BOT_UA.test(visitor.userAgent)
  const placement = visitor.placement?.slice(0, 40) || null

  try {
    await prisma.$transaction(async (tx) => {
      // One click at a time per campaign + visitor: without this lock, parallel requests
      // from one IP all pass the "seen in the last 24h?" check before any of them is logged,
      // and a script could drain a campaign from a single machine. The repeat check, the
      // charge and the log row share the transaction, so the next one sees this row.
      await tx.$queryRaw`SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext(${`ad-click:${campaignId}:${ipHash}`}))) AS l`
      let charge = live && human && !(await tx.adClick.findFirst({
        where: { campaignId, ipHash, createdAt: { gte: new Date(Date.now() - REPEAT_WINDOW_MS) } },
        select: { id: true }
      }))
      if (charge) {
        // Only the click that actually takes a unit off a positive balance is charged.
        const { count } = await tx.adCampaign.updateMany({
          where: { id: campaignId, status: 'ACTIVE', clicksRemaining: { gt: 0 } },
          data: { clicksRemaining: { decrement: 1 }, clicks: { increment: 1 } }
        })
        charge = count === 1
      }
      if (charge) {
        await tx.tool.update({ where: { id: campaign.toolId }, data: { clicksPaid: { increment: 1 } } })
        const { count: emptied } = await tx.adCampaign.updateMany({
          where: { id: campaignId, status: 'ACTIVE', clicksRemaining: { lte: 0 } },
          data: { status: 'EXHAUSTED' }
        })
        if (emptied) await syncToolAd(tx, campaign.toolId)
      }
      await tx.adClick.create({ data: { campaignId, placement, ipHash, charged: charge } })
    })
  } catch (err) {
    // The visitor still gets where they clicked (e.g. the campaign was deleted a moment
    // ago); a failed transaction charged nothing.
    console.error('[ads] click not recorded', campaignId, err)
  }
  return target
}
