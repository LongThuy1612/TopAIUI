import type Stripe from 'stripe'
import type { BillingInterval, Prisma, ResearchPlan } from '@prisma/client'
import {
  researchPlans, accessOf, isResearchPlan, isBillingInterval,
  type ResearchPlanKey, type BillingIntervalKey, type ResearchQuota
} from '#shared/research'

// Research Plan subscriptions (models Subscription, ResearchUsage, SubscriptionInvoice).
// New plans are paid with PayPal (server/utils/paypalSubscriptions.ts) unless Stripe
// checkout is switched on (isStripeCheckoutEnabled); a row's `provider` says which one
// it lives on. For Stripe, Stripe is the source of truth; these rows mirror it:
//
//   subscribe → Stripe Checkout (mode: subscription) → checkout.session.completed /
//     customer.subscription.created → syncStripeSubscription → Subscription row
//   every renewal → invoice.paid → recordStripeInvoice (+ new period, new usage row)
//   upgrade / downgrade → changePlan (Stripe prorates and charges at once)
//   cancel → cancel at period end (resume possible until then) → subscription.deleted
//   card fails → past_due while Stripe retries, then canceled → back to Free
//
// Quota: one ResearchUsage row per user and month. Credits reset every month, also on
// yearly plans (a yearly period is cut into months from the subscription's start).
// Separate from ads / promote orders (one-off payments, server/utils/stripe.ts).

// Statuses that still give the plan's access. past_due: Stripe is retrying the card.
export const ACCESS_STATUSES = ['active', 'trialing', 'past_due']
// A missed renewal webhook must not cut a paying customer off at once, nor keep a dead
// subscription alive for ever: access runs a few days past the period end.
const GRACE_MS = 3 * 24 * 60 * 60 * 1000

const bad = (message: string) => createError({ statusCode: 400, statusMessage: message, message })
const conflict = (message: string) => createError({ statusCode: 409, statusMessage: message, message })

export const isFakeSubscription = (id: string) => id.startsWith('fake_')

/* ------------------------------------------------------------------ */
/* Current plan + usage                                                */
/* ------------------------------------------------------------------ */

export async function currentSubscription(userId: string) {
  return prisma.subscription.findFirst({
    where: { userId, status: { in: ACCESS_STATUSES }, currentPeriodEnd: { gt: new Date(Date.now() - GRACE_MS) } },
    orderBy: { createdAt: 'desc' }
  })
}

// Calendar months, clamped to the month's last day like Stripe's billing anchor: Jan 31 +
// 1 month = Feb 28/29, not Mar 3 (what setUTCMonth would give).
const addMonths = (d: Date, n: number) => {
  const r = new Date(d)
  const day = r.getUTCDate()
  r.setUTCDate(1)
  r.setUTCMonth(r.getUTCMonth() + n)
  const last = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate()
  r.setUTCDate(Math.min(day, last))
  return r
}

// The month of quota `now` falls in. Paid: months counted from the subscription period's
// start (a monthly plan's month is its billing period). Free: the calendar month (UTC).
function quotaMonth(now: Date, sub: { currentPeriodStart: Date; currentPeriodEnd: Date } | null) {
  if (!sub) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    return { start, end: addMonths(start, 1) }
  }
  // Each month boundary counts from the period start (Jul 31 → Aug 31, Sep 30, Oct 31…), not
  // from the previous clamped boundary — Sep 30 + 1 month would end that month on Oct 30.
  let n = 0
  while (n < 12 && addMonths(sub.currentPeriodStart, n + 1) <= now) n++
  const start = n ? addMonths(sub.currentPeriodStart, n) : sub.currentPeriodStart
  const end = addMonths(sub.currentPeriodStart, n + 1)
  // Cut the month at the period end only while the period covers it. In the grace days
  // after a period (renewal webhook late) the month starts at that end — where the
  // renewed period will start too — and runs a full month.
  return { start, end: sub.currentPeriodEnd > start && end > sub.currentPeriodEnd ? sub.currentPeriodEnd : end }
}

export const quotaOf = (plan: ResearchPlanKey | 'FREE'): ResearchQuota => accessOf(plan).quota

// The plan whose access and quota apply: the subscription's, else Free. Admins run the
// site and are never asked to pay — they get the top plan without a subscription.
async function currentPlan(userId: string) {
  const [sub, user] = await Promise.all([
    currentSubscription(userId),
    prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
  ])
  const plan: ResearchPlanKey | 'FREE' = user?.role === 'ADMIN' ? 'ENTERPRISE' : sub ? sub.plan : 'FREE'
  return { sub, plan }
}

// The user's plan (FREE without a subscription giving access) and what it allows.
export async function currentAccess(userId: string) {
  const { plan } = await currentPlan(userId)
  return { plan, ...accessOf(plan) }
}

// The user's usage row for the current quota month — created on first use, with the
// limits of the plan they are on now. A plan change mid-month resets the limits to the
// new plan's (Stripe prorates the money the same way).
export async function currentUsage(userId: string) {
  const { sub, plan } = await currentPlan(userId)
  const quota = quotaOf(plan)
  const { start, end } = quotaMonth(new Date(), sub)
  const where = { userId_periodStart: { userId, periodStart: start } }
  const create = {
    userId, plan, periodStart: start, periodEnd: end,
    dataCreditsLimit: quota.dataCredits, socialQueriesLimit: quota.socialQueries, exportRowsLimit: quota.exportPerMonth
  }
  // Two requests opening the month at once (sidebar + Insights): the loser of the insert
  // race gets a unique violation — the row exists by then, so read it.
  const usage = await prisma.researchUsage.upsert({ where, create, update: {} })
    .catch(async (err) => {
      if (err?.code !== 'P2002') throw err
      return prisma.researchUsage.findUniqueOrThrow({ where })
    })
  if (usage.plan !== plan) {
    return prisma.researchUsage.update({
      where: { id: usage.id },
      data: { plan, periodEnd: end, dataCreditsLimit: quota.dataCredits, socialQueriesLimit: quota.socialQueries, exportRowsLimit: quota.exportPerMonth }
    })
  }
  // The end can move with the subscription (e.g. a cancelled yearly plan ending mid-month).
  if (usage.periodEnd.getTime() !== end.getTime()) {
    return prisma.researchUsage.update({ where: { id: usage.id }, data: { periodEnd: end } })
  }
  return usage
}

// Pays Data Credits for data rows (keys like "insights:2026-09:<slug>") before they are
// shown: 1 credit per row, and a row already paid this quota month is free again.
// Rows beyond the remaining credits are not allowed. Returns the allowed keys and the
// month's credits after charging. The usage row is locked meanwhile, so two tabs
// loading at once can't spend past the limit.
export async function chargeDataRows(userId: string, keys: string[]) {
  const usage = await currentUsage(userId)
  const wanted = [...new Set(keys)]
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM "ResearchUsage" WHERE "id" = ${usage.id} FOR UPDATE`
    const row = await tx.researchUsage.findUniqueOrThrow({ where: { id: usage.id } })
    const paid = new Set((await tx.researchUsageItem.findMany({
      where: { usageId: row.id, key: { in: wanted } },
      select: { key: true }
    })).map(i => i.key))
    const room = Math.max(0, row.dataCreditsLimit - row.dataCreditsUsed)
    const charge = wanted.filter(k => !paid.has(k)).slice(0, room)
    if (charge.length) {
      await tx.researchUsageItem.createMany({ data: charge.map(key => ({ usageId: row.id, key })) })
      await tx.researchUsage.update({ where: { id: row.id }, data: { dataCreditsUsed: { increment: charge.length } } })
    }
    return {
      allowed: new Set([...paid, ...charge]),
      charged: charge.length,
      used: row.dataCreditsUsed + charge.length,
      limit: row.dataCreditsLimit
    }
  })
}

// Spends export quota for `rows` rows (separate from Data Credits): at most the plan's
// rows per export, and what is left of this month's export rows. Locked like
// chargeDataRows, so parallel exports can't go past the month's limit.
export async function chargeExport(userId: string, rows: number) {
  const { quota } = await currentAccess(userId)
  if (rows > quota.exportPerRequest) {
    throw createError({ statusCode: 403, statusMessage: 'Export too large', message: `Your plan exports up to ${quota.exportPerRequest.toLocaleString('en-US')} rows at a time.`, data: { reason: 'per-request', limit: quota.exportPerRequest } })
  }
  const usage = await currentUsage(userId)
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM "ResearchUsage" WHERE "id" = ${usage.id} FOR UPDATE`
    const row = await tx.researchUsage.findUniqueOrThrow({ where: { id: usage.id } })
    const left = Math.max(0, row.exportRowsLimit - row.exportRowsUsed)
    if (rows > left) {
      throw createError({ statusCode: 403, statusMessage: 'Export quota reached', message: `You can export ${left.toLocaleString('en-US')} more rows this month.`, data: { reason: 'per-month', left } })
    }
    await tx.researchUsage.update({ where: { id: row.id }, data: { exportRowsUsed: { increment: rows } } })
    return { used: row.exportRowsUsed + rows, limit: row.exportRowsLimit }
  })
}

// Data rows of the current quota month the user has paid credits for, among `keys`.
export async function paidKeys(userId: string, keys: string[]) {
  const usage = await currentUsage(userId)
  const rows = await prisma.researchUsageItem.findMany({ where: { usageId: usage.id, key: { in: keys } }, select: { key: true } })
  return new Set(rows.map(r => r.key))
}

/* ------------------------------------------------------------------ */
/* Stripe prices                                                       */
/* ------------------------------------------------------------------ */

const lookupKey = (plan: ResearchPlanKey, interval: BillingIntervalKey) => `research_${plan.toLowerCase()}_${interval.toLowerCase()}`
const priceCache = new Map<string, string>()

// The Stripe Price for a plan, created on first use from shared/research.ts and found
// again by its lookup key. When the amount in code changes, a new Price takes over the
// key (transfer_lookup_key); running subscriptions keep their old price until changed.
async function stripePriceId(plan: ResearchPlanKey, interval: BillingIntervalKey) {
  const key = lookupKey(plan, interval)
  const amount = Math.round(researchPlans[plan].price[interval] * 100)
  const cached = priceCache.get(key)
  if (cached) return cached

  const stripe = useStripe()
  const existing = (await stripe.prices.list({ lookup_keys: [key], active: true, limit: 1 })).data[0]
  if (existing && existing.unit_amount === amount && existing.recurring?.interval === interval.toLowerCase()) {
    priceCache.set(key, existing.id)
    return existing.id
  }
  const productId = typeof existing?.product === 'string'
    ? existing.product
    : existing?.product?.id ?? (await stripe.products.create({
        name: `TopAICollection Research — ${plan.charAt(0)}${plan.slice(1).toLowerCase()}`,
        metadata: { kind: 'research_plan', plan }
      })).id
  const price = await stripe.prices.create({
    product: productId,
    currency: 'usd',
    unit_amount: amount,
    recurring: { interval: interval === 'YEAR' ? 'year' : 'month' },
    lookup_key: key,
    transfer_lookup_key: true,
    metadata: { kind: 'research_plan', plan, interval }
  })
  priceCache.set(key, price.id)
  return price.id
}

// Which plan / interval a Stripe price stands for (set on the prices created above).
function planOfPrice(price: Stripe.Price): { plan: ResearchPlan; interval: BillingInterval } | null {
  const plan = price.metadata?.plan
  const interval = price.metadata?.interval
  if (isResearchPlan(plan) && isBillingInterval(interval)) return { plan, interval }
  return null
}

/* ------------------------------------------------------------------ */
/* Subscribe / change / cancel                                         */
/* ------------------------------------------------------------------ */

// Stripe customer of the user — the one saved by earlier payments, or a new one.
// A saved id from another Stripe account / mode (test ↔ live) is replaced.
async function stripeCustomerFor(user: { id: string; email: string; name: string | null; stripeCustomerId: string | null }) {
  const stripe = useStripe()
  if (user.stripeCustomerId) {
    const found = await stripe.customers.retrieve(user.stripeCustomerId).catch(() => null)
    if (found && !('deleted' in found && found.deleted)) return found.id
  }
  const customer = await stripe.customers.create({ email: user.email, name: user.name ?? undefined, metadata: { userId: user.id } })
  await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customer.id } })
  return customer.id
}

export const addInterval = (d: Date, interval: BillingIntervalKey) => addMonths(d, interval === 'YEAR' ? 12 : 1)

// Free → a paid plan: a PayPal approval URL (or Stripe Checkout when switched on). Already
// on a plan: Stripe changes it in place; PayPal needs the new plan approved (a URL again).
// FAKE_PAYMENT (dev only): no payment — the subscription is written directly.
// `locale`: the visitor's language, for the page PayPal / Stripe sends them back to.
export async function subscribe(userId: string, plan: ResearchPlanKey, interval: BillingIntervalKey, locale?: unknown) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.isBanned || user.deletedAt) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  let current = await currentSubscription(userId)
  const fake = import.meta.dev && useRuntimeConfig().fakePayment
  // A subscription paid a moment ago may not be mirrored yet (webhook on its way): look
  // on Stripe / PayPal first, so a second click doesn't open a second paid subscription.
  if (!current && user.stripeCustomerId && useRuntimeConfig().stripeSecretKey && !fake) {
    const live = await liveResearchSubscriptions(user.stripeCustomerId)
    if (live[0]) {
      current = await syncStripeSubscription(live[0])
      // Paid on Stripe but not mirrorable here: never open a second paid subscription.
      if (!current || !ACCESS_STATUSES.includes(current.status)) {
        throw conflict('Your plan is being set up. Please reload the page in a minute.')
      }
    }
  }
  if (!current && !fake) current = await syncPendingPaypalSubscriptions(userId)
  if (current?.provider === 'paypal') return changePaypalPlan(current, user, plan, interval, locale)
  if (current) {
    await changePlan(current, plan, interval)
    return { changed: true as const }
  }

  if (fake) {
    const now = new Date()
    const sub = await prisma.subscription.create({
      data: {
        userId, plan, interval, status: 'active',
        stripeSubscriptionId: `fake_sub_${crypto.randomUUID()}`, stripePriceId: `fake_${lookupKey(plan, interval)}`,
        currentPeriodStart: now, currentPeriodEnd: addInterval(now, interval)
      }
    })
    await prisma.subscriptionInvoice.create({
      data: {
        userId, subscriptionId: sub.id, stripeInvoiceId: `fake_in_${crypto.randomUUID()}`,
        amount: Math.round(researchPlans[plan].price[interval] * 100), status: 'paid',
        plan, interval, periodStart: sub.currentPeriodStart, periodEnd: sub.currentPeriodEnd, paidAt: now
      }
    })
    return { changed: true as const }
  }

  if (!isStripeCheckoutEnabled()) return startPaypalSubscription(user, plan, interval, locale)

  const stripe = useStripe()
  const { public: { siteUrl } } = useRuntimeConfig()
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: await stripeCustomerFor(user),
    line_items: [{ price: await stripePriceId(plan, interval), quantity: 1 }],
    client_reference_id: user.id,
    metadata: { kind: 'research_plan', userId: user.id, plan, interval },
    subscription_data: { metadata: { kind: 'research_plan', userId: user.id, plan, interval } },
    success_url: `${siteUrl}${localizedPath(locale, '/dashboard')}?plan_session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}${localizedPath(locale, '/dashboard')}?plan_canceled=1`
  })
  return { checkoutUrl: session.url! }
}

// What undoes a scheduled cancellation on Stripe. Our own Cancel sets
// cancel_at_period_end; Stripe's billing portal may set a cancel_at date instead —
// clearing only the first would leave the second in place.
function undoCancelParams(sub: Stripe.Subscription): Stripe.SubscriptionUpdateParams {
  if (sub.cancel_at && !sub.cancel_at_period_end) return { cancel_at: '' }
  return { cancel_at_period_end: false }
}

// Upgrade / downgrade / switch monthly ↔ yearly. Stripe prorates and invoices the
// difference at once; if that payment fails, nothing changes (error_if_incomplete).
async function changePlan(current: { id: string; plan: ResearchPlan; interval: BillingInterval; stripeSubscriptionId: string; cancelAtPeriodEnd: boolean }, plan: ResearchPlanKey, interval: BillingIntervalKey) {
  if (current.plan === plan && current.interval === interval) throw bad('You are already on this plan.')

  if (isFakeSubscription(current.stripeSubscriptionId)) {
    await prisma.subscription.update({ where: { id: current.id }, data: { plan, interval, cancelAtPeriodEnd: false } })
    return
  }
  const stripe = useStripe()
  const sub = await stripe.subscriptions.retrieve(current.stripeSubscriptionId)
  const item = sub.items.data[0]
  if (!item) throw conflict('This subscription has no item to change.')
  try {
    const updated = await stripe.subscriptions.update(sub.id, {
      items: [{ id: item.id, price: await stripePriceId(plan, interval) }],
      proration_behavior: 'always_invoice',
      payment_behavior: 'error_if_incomplete',
      // Changing plan also keeps the subscription going if it was set to end.
      ...undoCancelParams(sub)
    })
    await syncStripeSubscription(updated)
  } catch (err: any) {
    // The prorated charge was declined: nothing changed (error_if_incomplete).
    if (err?.type === 'StripeCardError') throw createError({ statusCode: 402, statusMessage: 'Payment failed', message: err.message ?? 'The payment for the new plan failed.' })
    if (err?.type?.startsWith?.('Stripe')) {
      console.error('[research] plan change failed on Stripe', current.stripeSubscriptionId, err)
      throw createError({ statusCode: 502, statusMessage: 'Stripe error', message: 'The plan could not be changed right now. Please try again later.' })
    }
    throw err
  }
}

// Cancel at the end of the paid period (access until then), or undo that.
export async function setCancelAtPeriodEnd(userId: string, cancel: boolean) {
  const current = await currentSubscription(userId)
  if (!current) throw bad('You have no paid plan.')
  if (current.cancelAtPeriodEnd === cancel) return current
  if (isFakeSubscription(current.stripeSubscriptionId)) {
    return prisma.subscription.update({ where: { id: current.id }, data: { cancelAtPeriodEnd: cancel, canceledAt: cancel ? new Date() : null } })
  }
  if (current.provider === 'paypal') return setPaypalCancel(current, cancel)
  const stripe = useStripe()
  const params = cancel
    ? { cancel_at_period_end: true }
    : undoCancelParams(await stripe.subscriptions.retrieve(current.stripeSubscriptionId))
  const updated = await stripe.subscriptions.update(current.stripeSubscriptionId, params)
  return syncStripeSubscription(updated)
}

// The account is being deleted: stop billing it. Every subscription still giving
// access is cancelled now on Stripe (no further charge); fake (dev) ones locally.
// Throws if Stripe refuses, so the account isn't deleted while still being billed.
export async function cancelSubscriptionsForDeletedUser(userId: string) {
  // PayPal 'incomplete': an approval in progress, which would start billing once approved.
  const subs = await prisma.subscription.findMany({
    where: { userId, OR: [{ status: { in: ACCESS_STATUSES } }, { provider: 'paypal', status: 'incomplete' }] }
  })
  for (const s of subs) {
    if (isFakeSubscription(s.stripeSubscriptionId)) {
      await prisma.subscription.update({ where: { id: s.id }, data: { status: 'canceled', canceledAt: new Date(), endedAt: new Date() } })
      continue
    }
    if (s.provider === 'paypal') {
      await cancelPaypalSubscriptionNow(s)
      continue
    }
    try {
      await syncStripeSubscription(await useStripe().subscriptions.cancel(s.stripeSubscriptionId))
    } catch (err: any) {
      // Already cancelled on Stripe: just mirror that.
      if (err?.code === 'resource_missing' || /canceled/i.test(err?.message ?? '')) {
        await syncStripeSubscriptionById(s.stripeSubscriptionId).catch(() => {})
        continue
      }
      throw createError({ statusCode: 502, statusMessage: 'Stripe error', message: `Could not cancel the user's subscription on Stripe: ${err?.message ?? 'unknown error'}. The account was not deleted.` })
    }
  }
}

// Stripe's billing portal: card, invoices, cancel — for a real (non-fake) customer. A
// PayPal plan is managed in the buyer's own PayPal account.
export async function billingPortalUrl(userId: string, locale?: unknown) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { stripeCustomerId: true } })
  const current = await currentSubscription(userId)
  if (current?.provider === 'paypal') return paypalAutopayUrl()
  if (!user?.stripeCustomerId || (current && isFakeSubscription(current.stripeSubscriptionId))) {
    throw bad('There is no billing account to manage yet.')
  }
  const { public: { siteUrl } } = useRuntimeConfig()
  const session = await useStripe().billingPortal.sessions.create({ customer: user.stripeCustomerId, return_url: `${siteUrl}${localizedPath(locale, '/dashboard')}` })
  return session.url
}

/* ------------------------------------------------------------------ */
/* Webhook mirroring                                                   */
/* ------------------------------------------------------------------ */

const toDate = (s: number | null | undefined) => (s ? new Date(s * 1000) : null)

// The customer's research subscriptions on Stripe that still give access, newest first.
async function liveResearchSubscriptions(customerId: string) {
  const list = await useStripe().subscriptions.list({ customer: customerId, status: 'all', limit: 20 })
  return list.data
    .filter(s => ACCESS_STATUSES.includes(s.status) && s.items.data[0] && planOfPrice(s.items.data[0].price))
    .sort((a, b) => b.created - a.created)
}

// Webhooks arrive in any order: an old "updated: active" landing after "deleted" would
// bring a cancelled plan back. So a subscription event is mirrored from Stripe's current
// state, not from the (possibly stale) event payload — the payload is only a fallback.
export async function syncStripeSubscriptionById(id: string, fallback?: Stripe.Subscription) {
  let sub = fallback
  try {
    sub = await useStripe().subscriptions.retrieve(id)
  } catch (err) {
    if (!fallback) throw err
  }
  return sub ? syncStripeSubscription(sub) : null
}

// Two Checkout sessions opened side by side (two tabs) can both be paid. The newer
// subscription is then cancelled at once and its payment refunded; the user keeps the
// first one. Best effort: a failure is logged for a manual refund.
async function cancelDuplicate(sub: Stripe.Subscription) {
  const stripe = useStripe()
  console.error('[research] duplicate subscription — cancelling and refunding', sub.id)
  try {
    await stripe.subscriptions.cancel(sub.id)
    const invoiceId = typeof sub.latest_invoice === 'string' ? sub.latest_invoice : sub.latest_invoice?.id
    if (!invoiceId) return
    const invoice = await stripe.invoices.retrieve(invoiceId, { expand: ['payments'] })
    for (const p of invoice.payments?.data ?? []) {
      const pi = p.payment?.payment_intent
      const paymentIntent = typeof pi === 'string' ? pi : pi?.id
      if (paymentIntent && p.status === 'paid') {
        await stripe.refunds.create({ payment_intent: paymentIntent }, { idempotencyKey: `research-duplicate-refund-${sub.id}` })
      }
    }
  } catch (err) {
    console.error('[research] could not cancel / refund duplicate subscription — refund it by hand', sub.id, err)
  }
}

async function userIdOf(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null, metadataUserId?: string) {
  if (metadataUserId && await prisma.user.findUnique({ where: { id: metadataUserId }, select: { id: true } })) return metadataUserId
  const customerId = typeof customer === 'string' ? customer : customer?.id
  if (!customerId) return null
  return (await prisma.user.findFirst({ where: { stripeCustomerId: customerId }, select: { id: true } }))?.id ?? null
}

// Writes a Stripe subscription onto its Subscription row (created on first sight).
// Subscriptions that aren't research plans (no plan metadata on the price) are ignored.
export async function syncStripeSubscription(sub: Stripe.Subscription) {
  const item = sub.items.data[0]
  const planInfo = item ? planOfPrice(item.price) : null
  if (!item || !planInfo) return null
  const userId = await userIdOf(sub.customer, sub.metadata?.userId)
  if (!userId) {
    console.error('[research] subscription without a matching user', sub.id)
    return null
  }
  const data: Omit<Prisma.SubscriptionUncheckedCreateInput, 'userId' | 'stripeSubscriptionId'> = {
    plan: planInfo.plan,
    interval: planInfo.interval,
    status: sub.status,
    stripePriceId: item.price.id,
    currentPeriodStart: toDate(item.current_period_start)!,
    currentPeriodEnd: toDate(item.current_period_end)!,
    cancelAtPeriodEnd: sub.cancel_at_period_end || !!sub.cancel_at,
    canceledAt: toDate(sub.canceled_at),
    endedAt: toDate(sub.ended_at)
  }
  // A subscription newer than another one of the user that still gives access is a
  // duplicate — checked on every sync, so a later event can't revive it if cancelling
  // it on Stripe failed the first time (cancel is retried, the refund is idempotent).
  // Locked per user: two checkouts completing at once arrive as parallel webhooks, and
  // unlocked both would find no other subscription yet.
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext(${`research-sub:${userId}`}))) AS l`
    const known = await tx.subscription.findUnique({ where: { stripeSubscriptionId: sub.id }, select: { createdAt: true } })
    if (ACCESS_STATUSES.includes(sub.status) && !isFakeSubscription(sub.id)) {
      const other = await tx.subscription.findFirst({
        where: {
          userId,
          stripeSubscriptionId: { not: sub.id },
          status: { in: ACCESS_STATUSES },
          currentPeriodEnd: { gt: new Date() },
          createdAt: { lt: known?.createdAt ?? new Date() }
        },
        select: { id: true }
      })
      if (other) {
        await cancelDuplicate(sub)
        data.status = 'canceled'
        data.endedAt = new Date()
      }
    }
    return tx.subscription.upsert({
      where: { stripeSubscriptionId: sub.id },
      create: { ...data, userId, stripeSubscriptionId: sub.id },
      update: data
    })
    // Cancelling + refunding a duplicate calls Stripe inside the lock, hence the timeout.
  }, { timeout: 30_000 })
}

// The subscription an invoice belongs to (Stripe API 2025+: under parent).
function subscriptionIdOfInvoice(invoice: Stripe.Invoice) {
  const s = invoice.parent?.subscription_details?.subscription
  return typeof s === 'string' ? s : s?.id ?? null
}

// Records one invoice of a research subscription (first payment, renewals, prorations),
// upserted by its Stripe id so a re-delivered webhook can't add it twice.
export async function recordStripeInvoice(invoice: Stripe.Invoice) {
  const stripeSubId = subscriptionIdOfInvoice(invoice)
  if (!stripeSubId || !invoice.id) return null
  let sub = await prisma.subscription.findUnique({ where: { stripeSubscriptionId: stripeSubId } })
  if (!sub) {
    // The invoice can arrive before the subscription events: fetch and mirror it first.
    const synced = await syncStripeSubscriptionById(stripeSubId)
    if (!synced) return null
    sub = synced
  }
  const line = invoice.lines?.data?.[0]
  const data: Prisma.SubscriptionInvoiceUncheckedCreateInput = {
    userId: sub.userId,
    subscriptionId: sub.id,
    stripeInvoiceId: invoice.id,
    amount: invoice.amount_paid || invoice.amount_due,
    currency: invoice.currency,
    status: invoice.status ?? 'open',
    plan: sub.plan,
    interval: sub.interval,
    periodStart: toDate(line?.period?.start),
    periodEnd: toDate(line?.period?.end),
    hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
    invoicePdf: invoice.invoice_pdf ?? null,
    paidAt: toDate(invoice.status_transitions?.paid_at)
  }
  const { userId: _u, stripeInvoiceId: _s, ...update } = data
  return prisma.subscriptionInvoice.upsert({ where: { stripeInvoiceId: invoice.id }, create: data, update })
}

// A renewal is about to be charged (invoice.created for a new billing cycle — Stripe waits
// for this webhook before finalizing the draft and taking the money). If the user is banned
// by then, the draft is deleted (nothing charged) and the subscription cancelled: banned
// users keep their plan to the end of the period they paid, but it is never renewed. A ban
// lifted before the renewal lets it renew as usual. Errors propagate, so Stripe retries the
// webhook rather than charging a banned user.
export async function stopRenewalIfBanned(invoice: Stripe.Invoice) {
  if (invoice.billing_reason !== 'subscription_cycle' || !invoice.id) return null
  const stripeSubId = subscriptionIdOfInvoice(invoice)
  if (!stripeSubId) return null
  const row = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: stripeSubId },
    select: { id: true, user: { select: { isBanned: true } } }
  })
  if (!row?.user.isBanned) return null // not a research plan, or the user is fine

  console.warn('[research] renewal of a banned user — cancelling instead', stripeSubId)
  const stripe = useStripe()
  // Each step tolerates having been done by an earlier delivery of this webhook (Stripe
  // retries it when a later step failed): otherwise a retry would stop at "No such invoice"
  // and never cancel the subscription.
  const done = (err: any) => err?.code === 'resource_missing' || /already|deleted|canceled|void/i.test(err?.message ?? '')
  try {
    if (invoice.status === 'draft') await stripe.invoices.del(invoice.id)
    else if (invoice.status === 'open') await stripe.invoices.voidInvoice(invoice.id)
  } catch (err) {
    if (!done(err)) throw err
  }
  try {
    await stripe.subscriptions.cancel(stripeSubId, { invoice_now: false, prorate: false })
  } catch (err) {
    if (!done(err)) throw err
  }
  return syncStripeSubscriptionById(stripeSubId)
}

// Back from Checkout (?plan_session=…): mirror the subscription now instead of waiting
// for the webhook, so the dashboard shows the new plan right away.
export async function syncCheckoutSession(userId: string, sessionId: string) {
  const session = await useStripe().checkout.sessions.retrieve(sessionId)
  if (session.metadata?.userId !== userId || session.metadata?.kind !== 'research_plan') {
    throw createError({ statusCode: 404, statusMessage: 'Session not found' })
  }
  const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
  if (!subId) return null
  return syncStripeSubscriptionById(subId)
}

export const isResearchCheckout = (session: Stripe.Checkout.Session) => session.mode === 'subscription' && session.metadata?.kind === 'research_plan'
