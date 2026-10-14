import type { Prisma, Subscription, SubscriptionInvoice } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { isError } from 'h3'
import {
  researchPlans, isResearchPlan, isBillingInterval,
  type ResearchPlanKey, type BillingIntervalKey
} from '#shared/research'

// Research Plans paid with PayPal (Subscriptions API, /v1/billing) — the PayPal side of
// server/utils/research.ts. A Subscription row with provider "paypal" keeps the PayPal
// subscription id (I-…) in stripeSubscriptionId and the PayPal plan id in stripePriceId;
// a SubscriptionInvoice keeps the PayPal sale id in stripeInvoiceId.
//
//   subscribe → 'incomplete' row + PayPal subscription → the buyer approves on PayPal →
//     back on /dashboard?plan_provider=paypal&subscription_id=I-… → syncPaypalSubscription
//     (the webhook does the same: BILLING.SUBSCRIPTION.ACTIVATED)
//   every payment (first one + renewals) → PAYMENT.SALE.COMPLETED → recordPaypalPayment
//   change plan → a new PayPal subscription for the new plan (a new amount needs the
//     buyer's approval on PayPal). Once it is active the old one is cancelled and the
//     unused part of its last payment refunded — the same money as Stripe's proration.
//   cancel → suspended on PayPal: no renewal, access until the period end; "Keep my plan"
//     re-activates it. The nightly task research:paypal-cleanup cancels it for good once
//     the period is over. A plan cancelled from the buyer's PayPal account also runs to
//     the end of the paid period, but can't be resumed (picking a plan again restarts it).
//   payment fails → PayPal retries ('past_due'), then suspends it ('unpaid', no access)
// PayPal has no hook before a renewal is charged (Stripe's invoice.created), so banning a
// user suspends their subscription at once (stopPaypalRenewalsOfUser).

type Money = { currency_code: string; value: string }
type PaypalSubscription = {
  id: string
  // APPROVAL_PENDING | APPROVED | ACTIVE | SUSPENDED | CANCELLED | EXPIRED
  status: string
  plan_id: string
  custom_id?: string // "<userId>" or "<userId>:<id of the Subscription row it replaces>"
  start_time?: string
  billing_info?: {
    next_billing_time?: string
    last_payment?: { time: string; amount?: Money }
    outstanding_balance?: Money
  }
  links?: { rel: string; href: string }[]
}
// PAYMENT.SALE.COMPLETED resource (a subscription payment).
export type PaypalSale = { id: string; billing_agreement_id?: string; amount?: { total: string; currency: string }; create_time?: string }

// Rows that never gave access and never may: any payment PayPal still takes for them is
// refunded. duplicate: a second plan paid by mistake; refused: approved by a banned or
// deleted user; incomplete_expired: an approval we gave up on, finished on PayPal later.
const REFUNDED_STATUSES = ['duplicate', 'refused', 'incomplete_expired']

const bad = (message: string) => createError({ statusCode: 400, statusMessage: message, message })
const paypalFailed = (what: string, err: unknown) => {
  console.error(`[paypal] ${what} failed`, err)
  const message = (err as { data?: { message?: string } })?.data?.message
  return createError({ statusCode: 502, statusMessage: 'PayPal error', message: `${what} failed on PayPal${message ? `: ${message}` : ''}. Please try again later.` })
}

const mode = () => useRuntimeConfig().paypalMode === 'live' ? 'live' : 'sandbox'
const toDate = (s: string | null | undefined) => (s ? new Date(s) : null)
const cents = (m: { value?: string; total?: string } | undefined) => Math.round(Number(m?.value ?? m?.total ?? 0) * 100)
const subPath = (id: string, action = '') => `/v1/billing/subscriptions/${encodeURIComponent(id)}${action}`
const getRemote = (id: string): Promise<PaypalSubscription> => paypalApi<PaypalSubscription>(subPath(id))

/* ------------------------------------------------------------------ */
/* Product + plans                                                     */
/* ------------------------------------------------------------------ */

const planKey = (plan: ResearchPlanKey, interval: BillingIntervalKey, amount: number) =>
  `research_${plan.toLowerCase()}_${interval.toLowerCase()}_${amount}_${mode()}`

// "research_starter_month_1900_live" → { plan, interval }
function planOfKey(key: string) {
  const [, plan, interval] = key.split('_')
  const p = plan?.toUpperCase()
  const i = interval?.toUpperCase()
  return isResearchPlan(p) && isBillingInterval(i) ? { plan: p, interval: i } : null
}

// The PayPal plan for a Research Plan at its price in shared/research.ts — created on first
// use. The request id makes two first subscribers at once get the same product / plan.
async function paypalPlanId(plan: ResearchPlanKey, interval: BillingIntervalKey) {
  const amount = Math.round(researchPlans[plan].price[interval] * 100)
  const key = planKey(plan, interval, amount)
  const known = await prisma.paypalPlan.findUnique({ where: { key } })
  if (known) return known.planId

  const productKey = `research_product_${mode()}`
  let product = await prisma.paypalPlan.findUnique({ where: { key: productKey } })
  if (!product) {
    const created = await paypalApi<{ id: string }>('/v1/catalogs/products', {
      method: 'POST',
      requestId: productKey,
      body: { name: 'TopAICollection Research', type: 'SERVICE', category: 'SOFTWARE' }
    })
    product = await prisma.paypalPlan.upsert({ where: { key: productKey }, create: { key: productKey, planId: created.id }, update: {} })
  }

  const name = `${plan.charAt(0)}${plan.slice(1).toLowerCase()}`
  const created = await paypalApi<{ id: string }>('/v1/billing/plans', {
    method: 'POST',
    requestId: key,
    body: {
      product_id: product.planId,
      name: `TopAICollection Research — ${name} (${interval === 'YEAR' ? 'yearly' : 'monthly'})`,
      status: 'ACTIVE',
      billing_cycles: [{
        frequency: { interval_unit: interval, interval_count: 1 },
        tenure_type: 'REGULAR',
        sequence: 1,
        total_cycles: 0, // renews until cancelled
        pricing_scheme: { fixed_price: { currency_code: 'USD', value: (amount / 100).toFixed(2) } }
      }],
      // A failed renewal is retried, and after 3 failures PayPal suspends the subscription.
      payment_preferences: { auto_bill_outstanding: true, payment_failure_threshold: 3 }
    }
  })
  return (await prisma.paypalPlan.upsert({ where: { key }, create: { key, planId: created.id }, update: {} })).planId
}

/* ------------------------------------------------------------------ */
/* Subscribe / change / cancel                                         */
/* ------------------------------------------------------------------ */

// A new PayPal subscription → { checkoutUrl } where the buyer approves it. `replaces`: the
// Subscription row it takes over from (a plan change), ended once this one is active.
export function startPaypalSubscription(
  user: { id: string; email: string },
  plan: ResearchPlanKey,
  interval: BillingIntervalKey,
  locale?: unknown,
  replaces?: string
) {
  return createPaypalSubscription(user, plan, interval, locale, replaces).catch((err) => {
    if (isError(err)) throw err
    throw paypalFailed(replaces ? 'Changing the plan' : 'Subscribing', err)
  })
}

async function createPaypalSubscription(
  user: { id: string; email: string },
  plan: ResearchPlanKey,
  interval: BillingIntervalKey,
  locale?: unknown,
  replaces?: string
) {
  const { public: { siteUrl } } = useRuntimeConfig()
  const back = `${siteUrl}${localizedPath(locale, '/dashboard')}`
  const planId = await paypalPlanId(plan, interval)
  const sub = await paypalApi<PaypalSubscription>('/v1/billing/subscriptions', {
    method: 'POST',
    requestId: randomUUID(),
    body: {
      plan_id: planId,
      custom_id: replaces ? `${user.id}:${replaces}` : user.id,
      subscriber: { email_address: user.email },
      application_context: {
        brand_name: 'TopAICollection',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        // PayPal adds &subscription_id=I-…
        return_url: `${back}?plan_provider=paypal`,
        cancel_url: `${back}?plan_canceled=1`
      }
    }
  })
  const approveUrl = sub.links?.find(l => l.rel === 'approve')?.href
  if (!approveUrl) throw createError({ statusCode: 502, statusMessage: 'PayPal did not return an approval link' })

  // Gives no access while 'incomplete': it only lets a second click find this subscription
  // once approved (syncPendingPaypalSubscriptions) instead of opening another one.
  const now = new Date()
  await prisma.subscription.create({
    data: {
      userId: user.id, plan, interval, status: 'incomplete', provider: 'paypal', providerStatus: sub.status,
      stripeSubscriptionId: sub.id, stripePriceId: planId, currentPeriodStart: now, currentPeriodEnd: now
    }
  })
  return { checkoutUrl: approveUrl }
}

// The user's PayPal subscriptions approved but not mirrored yet (webhook on its way) —
// checked before opening a new one, so a second click can't pay twice, and when the plan
// is loaded (GET /api/me/plan). Returns the one now giving access, if any. Each is asked
// at most every 15 s: the plan is loaded on every dashboard page.
export async function syncPendingPaypalSubscriptions(userId: string) {
  const pending = await prisma.subscription.findMany({
    where: {
      userId, provider: 'paypal', status: 'incomplete',
      createdAt: { gt: new Date(Date.now() - 3 * 60 * 60 * 1000) },
      updatedAt: { lt: new Date(Date.now() - 15_000) }
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  })
  for (const row of pending) {
    const synced = await syncPaypalSubscription(row.stripeSubscriptionId).catch((err) => {
      console.error('[paypal] sync of a pending subscription failed', row.stripeSubscriptionId, err)
      return null
    })
    if (synced && ACCESS_STATUSES.includes(synced.status)) {
      await recordQuietly(synced)
      return synced
    }
  }
  return null
}

// Upgrade / downgrade / switch monthly ↔ yearly → { checkoutUrl } for the new plan (see the
// top of this file). Picking the same plan again is allowed only to restart a plan
// cancelled from the PayPal account (it can't be resumed).
export async function changePaypalPlan(current: Subscription, user: { id: string; email: string }, plan: ResearchPlanKey, interval: BillingIntervalKey, locale?: unknown) {
  if (current.plan === plan && current.interval === interval && isPaypalResumable(current)) {
    throw bad('You are already on this plan.')
  }
  return startPaypalSubscription(user, plan, interval, locale, current.id)
}

// Whether "Keep my plan" can still undo a cancellation: not once the plan was cancelled
// from the PayPal account (PayPal can't reactivate it), nor after the paid period (in the
// grace days) — then picking the same plan again starts a new one.
export function isPaypalResumable(sub: Pick<Subscription, 'providerStatus' | 'currentPeriodEnd'>) {
  return sub.providerStatus !== 'CANCELLED' && sub.providerStatus !== 'EXPIRED' && sub.currentPeriodEnd > new Date()
}

// Cancel at the end of the paid period (suspend: no renewal), or undo that (activate).
export async function setPaypalCancel(current: Subscription, cancel: boolean) {
  const id = current.stripeSubscriptionId
  if (cancel) {
    // Marked first: the SUSPENDED webhook may arrive before PayPal answers, and must read
    // "cancelled by the customer" rather than "suspended after failed payments".
    await prisma.subscription.update({ where: { id: current.id }, data: { cancelAtPeriodEnd: true, canceledAt: new Date() } })
    try {
      await paypalApi(subPath(id, '/suspend'), { method: 'POST', body: { reason: 'Cancelled by the customer' } })
    } catch (err) {
      await prisma.subscription.update({ where: { id: current.id }, data: { cancelAtPeriodEnd: false, canceledAt: null } })
      throw paypalFailed('Cancelling the plan', err)
    }
  } else {
    if (current.providerStatus === 'CANCELLED' || current.providerStatus === 'EXPIRED') {
      throw bad('This plan was cancelled in your PayPal account and can no longer be resumed. Pick a plan again to restart it.')
    }
    // In the grace days after the period: the plan has ended, a new one starts it again.
    if (current.currentPeriodEnd <= new Date()) throw bad('This plan has already ended. Pick a plan to subscribe again.')
    try {
      await paypalApi(subPath(id, '/activate'), { method: 'POST', body: { reason: 'Resumed by the customer' } })
    } catch (err) {
      throw paypalFailed('Resuming the plan', err)
    }
    await prisma.subscription.update({ where: { id: current.id }, data: { cancelAtPeriodEnd: false, canceledAt: null } })
  }
  return syncPaypalSubscription(id)
}

// Cancels on PayPal for good (no more payments). Already cancelled / expired is fine.
async function cancelRemote(id: string, reason: string) {
  try {
    await paypalApi(subPath(id, '/cancel'), { method: 'POST', body: { reason } })
  } catch (err) {
    if (paypalIssue(err) === 'SUBSCRIPTION_STATUS_INVALID') return // not cancellable any more
    throw err
  }
}

// The account is being deleted: cancel now, no further payment. Throws if PayPal refuses,
// so the account isn't deleted while still being billed. Also used for approvals not
// finished (or not mirrored yet): a late approval must not start billing a deleted account.
export async function cancelPaypalSubscriptionNow(row: Subscription) {
  if (row.status === 'incomplete') {
    // Not billing yet: given up here (a later approval is refused, see
    // syncPaypalSubscription); cancelling on PayPal is only tidying up.
    await prisma.subscription.update({ where: { id: row.id }, data: { status: 'incomplete_expired' } })
    await cancelRemote(row.stripeSubscriptionId, 'Account deleted')
      .catch(err => console.error('[paypal] cancel of an unfinished approval failed', row.stripeSubscriptionId, err))
    return
  }
  try {
    await cancelRemote(row.stripeSubscriptionId, 'Account deleted')
  } catch (err) {
    throw createError({ statusCode: 502, statusMessage: 'PayPal error', message: `Could not cancel the user's subscription on PayPal: ${(err as Error)?.message ?? 'unknown error'}. The account was not deleted.` })
  }
  const now = new Date()
  await prisma.subscription.update({ where: { id: row.id }, data: { status: 'canceled', providerStatus: 'CANCELLED', canceledAt: row.canceledAt ?? now, endedAt: now } })
}

// A banned user keeps the period they paid for, but it is never renewed: suspended now,
// as if they cancelled (PayPal gives no chance to stop a renewal just before it).
export async function stopPaypalRenewalsOfUser(userId: string) {
  const subs = await prisma.subscription.findMany({
    where: { userId, provider: 'paypal', status: { in: ACCESS_STATUSES }, cancelAtPeriodEnd: false }
  })
  for (const s of subs) await setPaypalCancel(s, true)
}

// Where the buyer manages a PayPal subscription (funding source, cancel): their own
// PayPal account — PayPal has no per-merchant portal like Stripe's.
export const paypalAutopayUrl = () => `https://www.${mode() === 'live' ? '' : 'sandbox.'}paypal.com/myaccount/autopay/`

/* ------------------------------------------------------------------ */
/* Mirroring                                                           */
/* ------------------------------------------------------------------ */

// Refunds a subscription payment (PayPal sale), all of it or `amount` cents. The request id
// makes a retry return the same refund. Never throws: false (logged) means it failed.
async function refundSale(saleId: string, amount: number | null, key: string) {
  try {
    await paypalApi(`/v1/payments/sale/${encodeURIComponent(saleId)}/refund`, {
      method: 'POST',
      requestId: key,
      body: amount == null ? {} : { amount: { total: (amount / 100).toFixed(2), currency: 'USD' } }
    })
    return true
  } catch (err) {
    console.error('[paypal] refund failed — retried by the nightly cleanup', saleId, amount ?? 'full', err)
    return false
  }
}

// Refunds `cents` of a recorded payment (`full`: all of it) and books it on the invoice, so
// the payment history shows it: refundedAmount, and status "void" once all of it is back.
// If PayPal fails, the amount stays owed (refundDue) and research:paypal-cleanup retries it
// nightly with the same key — PayPal then returns the same refund instead of a second one.
async function refundInvoice(db: Prisma.TransactionClient, invoice: SubscriptionInvoice, cents: number, key: string, full: boolean) {
  if (cents <= 0) return
  // A retry of a full refund: the first try may have gone through on PayPal (timeout), and
  // its request id may be forgotten by now — the sale's state tells.
  const alreadyBack = full && invoice.refundDue > 0 &&
    (await paypalApi<{ state?: string }>(`/v1/payments/sale/${encodeURIComponent(invoice.stripeInvoiceId)}`).catch(() => null))?.state === 'refunded'
  if (alreadyBack || await refundSale(invoice.stripeInvoiceId, full ? null : cents, key)) {
    const refundedAmount = invoice.refundedAmount + cents
    await db.subscriptionInvoice.update({
      where: { id: invoice.id },
      data: { refundedAmount, refundDue: 0, refundKey: null, ...(refundedAmount >= invoice.amount ? { status: 'void' } : {}) }
    })
  } else {
    await db.subscriptionInvoice.update({ where: { id: invoice.id }, data: { refundDue: cents, refundKey: key } })
  }
}

// The plan being replaced by a new one (plan change): cancelled on PayPal now, and the
// unused part of its last payment refunded. A failed cancel throws (the sync is retried —
// the old plan must not keep billing); a failed refund is only logged, for a manual one.
async function endReplaced(tx: Prisma.TransactionClient, old: Subscription) {
  await cancelRemote(old.stripeSubscriptionId, 'Replaced by a new plan')
  const now = new Date()
  const last = await tx.subscriptionInvoice.findFirst({
    where: { subscriptionId: old.id, status: 'paid' },
    orderBy: { paidAt: 'desc' }
  })
  const span = old.currentPeriodEnd.getTime() - old.currentPeriodStart.getTime()
  const left = old.currentPeriodEnd.getTime() - now.getTime()
  // Only a payment for the running period is prorated back: past_due means this period's
  // renewal never came in, and the last payment found then paid an earlier period.
  const paysThisPeriod = !!last?.paidAt && old.status !== 'past_due' &&
    last.paidAt.getTime() >= old.currentPeriodStart.getTime() - 2 * 24 * 60 * 60 * 1000
  if (last && paysThisPeriod && span > 0 && left > 0) {
    const unused = Math.min(last.amount, Math.round(last.amount * left / span))
    if (unused > 0) await refundInvoice(tx, last, unused, `research-replace-refund-${old.id}`, false)
  }
  await tx.subscription.update({
    where: { id: old.id },
    data: { status: 'canceled', providerStatus: 'CANCELLED', canceledAt: old.canceledAt ?? now, endedAt: now }
  })
}

// Mirrors a PayPal subscription onto its Subscription row (see the top of this file for
// the status mapping). Safe to call any number of times, from the webhook and the return
// page at once: locked per user, like syncStripeSubscription.
// `paidAt`: a payment just reported by PAYMENT.SALE.COMPLETED. PayPal's subscription can
// still lag behind it (no last_payment yet), which must not leave a paid plan 'incomplete'.
export async function syncPaypalSubscription(id: string, opts: { paidAt?: Date } = {}): Promise<Subscription | null> {
  // The user (for the lock) from our row, or from the subscription's custom_id if we have none.
  const existing = await prisma.subscription.findUnique({ where: { stripeSubscriptionId: id }, select: { userId: true } })
  const userId = existing?.userId ?? (await getRemote(id)).custom_id?.split(':')[0]
  if (!userId || !await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })) {
    console.error('[paypal] subscription without a matching user', id)
    return null
  }

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext(${`research-sub:${userId}`}))) AS l`
    // Read inside the lock: two syncs at once (webhook + return page) apply PayPal's states
    // in order, never an older one over a newer one.
    const remote = await getRemote(id)
    const replaces = (remote.custom_id ?? '').split(':')[1]
    let row = await tx.subscription.findUnique({ where: { stripeSubscriptionId: id } })
    if (!row) {
      // Normally made by startPaypalSubscription; rebuilt from the plan if that insert failed.
      const planRow = await tx.paypalPlan.findFirst({ where: { planId: remote.plan_id } })
      const planInfo = planRow && planOfKey(planRow.key)
      if (!planInfo) return null // not one of our Research Plans
      const now = new Date()
      row = await tx.subscription.create({
        data: {
          userId, ...planInfo, status: 'incomplete', provider: 'paypal', stripeSubscriptionId: id,
          stripePriceId: remote.plan_id, currentPeriodStart: now, currentPeriodEnd: now
        }
      })
    }
    // Ended by us (replaced, duplicate, refused, account deleted, given up): never revived,
    // and never billed again — e.g. an approval finished on PayPal after we gave up on it.
    if (row.status === 'canceled' || REFUNDED_STATUSES.includes(row.status)) {
      let providerStatus = remote.status
      if (remote.status === 'ACTIVE' || remote.status === 'SUSPENDED') {
        await cancelRemote(id, 'Subscription ended')
        providerStatus = 'CANCELLED'
      } else if (remote.status === 'APPROVAL_PENDING' || remote.status === 'APPROVED') {
        // Not billing yet; if PayPal won't cancel it, a later approval lands here again.
        await cancelRemote(id, 'Subscription ended')
          .then(() => { providerStatus = 'CANCELLED' })
          .catch(err => console.error('[paypal] cancel of an unfinished approval failed', id, err))
      }
      return tx.subscription.update({ where: { id: row.id }, data: { providerStatus } })
    }

    const now = new Date()
    const data: Prisma.SubscriptionUpdateInput = { providerStatus: remote.status }
    let start = row.currentPeriodStart
    let end = row.currentPeriodEnd
    let status = row.status
    const wasLive = ACCESS_STATUSES.includes(row.status)
    switch (remote.status) {
      case 'APPROVAL_PENDING':
      case 'APPROVED':
        status = 'incomplete'
        break
      case 'ACTIVE': {
        const reported = toDate(remote.billing_info?.last_payment?.time)
        const lastPaid = reported && opts.paidAt ? (reported > opts.paidAt ? reported : opts.paidAt) : reported ?? opts.paidAt ?? null
        // Approved, but the first payment isn't in yet (or failed): no access until it is —
        // PAYMENT.SALE.COMPLETED syncs again. Unlike a renewal, a failed first payment never
        // gave anything to keep.
        if (!lastPaid && !wasLive) {
          status = 'incomplete'
          break
        }
        start = lastPaid ?? start
        const next = toDate(remote.billing_info?.next_billing_time)
        end = next && next > start ? next : addInterval(start, row.interval)
        status = cents(remote.billing_info?.outstanding_balance) > 0 ? 'past_due' : 'active'
        // cancelAtPeriodEnd is left alone: an ACTIVE read just before our own Cancel suspends
        // it must not wipe the flag, or the SUSPENDED that follows would read as "payments
        // failed" and cut access. Resuming clears it (setPaypalCancel).
        break
      }
      case 'SUSPENDED':
        // Suspended by our Cancel: runs to the end of the paid period. Otherwise PayPal
        // gave up on a failed payment: no access.
        status = row.cancelAtPeriodEnd ? (end > now ? 'active' : 'canceled') : 'unpaid'
        if (status === 'canceled') data.endedAt = row.endedAt ?? now
        break
      case 'CANCELLED':
      case 'EXPIRED':
        // Cancelled from the PayPal account: the period already paid still counts.
        if (wasLive && end > now) {
          status = 'active'
          Object.assign(data, { cancelAtPeriodEnd: true, canceledAt: row.canceledAt ?? now })
        } else {
          status = 'canceled'
          Object.assign(data, { canceledAt: row.canceledAt ?? now, endedAt: row.endedAt ?? now })
        }
        break
    }

    if (ACCESS_STATUSES.includes(status) && !wasLive) {
      // Approved by a user banned or deleted meanwhile (the PayPal page was still open):
      // refused — cancelled, its payment refunded — and the plan it would replace is kept.
      const owner = await tx.user.findUnique({ where: { id: userId }, select: { isBanned: true, deletedAt: true } })
      const refused = !!(owner?.isBanned || owner?.deletedAt)
      // A plan change: the plan it replaces ends now.
      if (replaces && !refused) {
        const old = await tx.subscription.findFirst({ where: { id: replaces, userId, provider: 'paypal' } })
        if (old && ACCESS_STATUSES.includes(old.status)) await endReplaced(tx, old)
      }
      // Two approvals side by side (two tabs) both went through: this later one is
      // cancelled; its payment is refunded (recordPaypalPayment, or here if it came first).
      const other = refused ? null : await tx.subscription.findFirst({
        where: { userId, id: { not: row.id }, status: { in: ACCESS_STATUSES }, currentPeriodEnd: { gt: now } },
        select: { id: true }
      })
      if (refused || other) {
        console.error(`[paypal] ${refused ? 'subscription of a banned / deleted user' : 'duplicate subscription'} — cancelling and refunding`, id)
        await cancelRemote(id, refused ? 'Account closed' : 'Duplicate subscription')
        status = refused ? 'refused' : 'duplicate'
        Object.assign(data, { canceledAt: now, endedAt: now })
        const paid = await tx.subscriptionInvoice.findMany({ where: { subscriptionId: row.id, status: 'paid' } })
        for (const p of paid) {
          await refundInvoice(tx, p, p.amount - p.refundedAmount, `research-duplicate-refund-${p.stripeInvoiceId}`, p.refundedAmount === 0)
        }
      }
    }

    return tx.subscription.update({
      where: { id: row.id },
      data: { ...data, status, currentPeriodStart: start, currentPeriodEnd: end }
    })
    // PayPal calls (cancel / refund) run inside the lock, hence the timeout.
  }, { timeout: 30_000 })
}

// One payment of a subscription (the first one, a renewal): recorded once (by sale id),
// after mirroring the subscription's new period. A payment of a row that may never bill
// (REFUNDED_STATUSES) is refunded.
export async function recordPaypalPayment(sale: PaypalSale) {
  if (!sale.billing_agreement_id) return null
  const known = await prisma.subscription.findUnique({ where: { stripeSubscriptionId: sale.billing_agreement_id } })
  if (known && known.provider !== 'paypal') return null
  const paidAt = toDate(sale.create_time) ?? new Date()
  const sub = await syncPaypalSubscription(sale.billing_agreement_id, { paidAt }) ?? known
  if (!sub) return null // not a Research Plan

  const data: Prisma.SubscriptionInvoiceUncheckedCreateInput = {
    userId: sub.userId,
    subscriptionId: sub.id,
    stripeInvoiceId: sale.id,
    amount: cents(sale.amount),
    currency: (sale.amount?.currency ?? 'usd').toLowerCase(),
    status: 'paid',
    plan: sub.plan,
    interval: sub.interval,
    periodStart: sub.currentPeriodStart,
    periodEnd: sub.currentPeriodEnd,
    paidAt
  }
  const invoice = await prisma.subscriptionInvoice.upsert({ where: { stripeInvoiceId: sale.id }, create: data, update: {} })
  if (REFUNDED_STATUSES.includes(sub.status) && invoice.status === 'paid' && !invoice.refundDue) {
    await refundInvoice(prisma, invoice, invoice.amount - invoice.refundedAmount, `research-duplicate-refund-${sale.id}`, invoice.refundedAmount === 0)
  }
  return invoice
}

// The subscription's completed payments, read from PayPal and recorded like the webhook's
// PAYMENT.SALE.COMPLETED would (same sale id, so never twice). Without it a plan activated
// on the way back from PayPal has no invoice until the webhook arrives — or ever, when the
// webhook isn't set up. Called after a plan goes live and nightly for live plans.
type PaypalTransaction = { id: string; status: string; time?: string; amount_with_breakdown?: { gross_amount?: Money } }
export async function recordPaypalTransactions(sub: Subscription, sinceDays = 45) {
  if (sub.provider !== 'paypal' || !ACCESS_STATUSES.includes(sub.status)) return 0
  const end = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const start = new Date(Math.max(sub.createdAt.getTime() - 24 * 60 * 60 * 1000, Date.now() - sinceDays * 24 * 60 * 60 * 1000))
  const res = await paypalApi<{ transactions?: PaypalTransaction[] }>(
    subPath(sub.stripeSubscriptionId, `/transactions?start_time=${start.toISOString()}&end_time=${end.toISOString()}`)
  )
  const done = (res.transactions ?? []).filter(t => t.status === 'COMPLETED' && t.id)
  if (!done.length) return 0
  const known = new Set((await prisma.subscriptionInvoice.findMany({
    where: { stripeInvoiceId: { in: done.map(t => t.id) } }, select: { stripeInvoiceId: true }
  })).map(i => i.stripeInvoiceId))
  let recorded = 0
  for (const t of done.filter(t => !known.has(t.id))) {
    const gross = t.amount_with_breakdown?.gross_amount
    await recordPaypalPayment({
      id: t.id,
      billing_agreement_id: sub.stripeSubscriptionId,
      amount: { total: gross?.value ?? '0', currency: gross?.currency_code ?? 'USD' },
      create_time: t.time
    })
    recorded++
  }
  return recorded
}
const recordQuietly = (sub: Subscription | null) => {
  if (sub && ACCESS_STATUSES.includes(sub.status)) {
    return recordPaypalTransactions(sub).catch(err => console.error('[paypal] reading payments failed', sub.stripeSubscriptionId, err))
  }
}

// Invoice history (GET /api/orders): a live PayPal plan with no payment recorded yet is
// read from PayPal — at most once a minute per plan (the page may be reloaded).
const lastInvoiceCheck = new Map<string, number>()
export async function ensurePaypalInvoices(userId: string) {
  if (!isPaypalConfigured()) return
  const subs = await prisma.subscription.findMany({
    where: { userId, provider: 'paypal', status: { in: ACCESS_STATUSES }, invoices: { none: {} } }
  })
  for (const sub of subs) {
    if (Date.now() - (lastInvoiceCheck.get(sub.id) ?? 0) < 60_000) continue
    lastInvoiceCheck.set(sub.id, Date.now())
    await recordQuietly(sub)
  }
}

// Back from PayPal (?subscription_id=I-…): mirror it now, for the user it belongs to.
// The first payment can land a few seconds after the approval: wait a little for it, so
// the dashboard shows the new plan instead of Free.
export async function syncPaypalReturn(userId: string, id: string): Promise<Subscription | null> {
  const row = await prisma.subscription.findFirst({ where: { stripeSubscriptionId: id, userId, provider: 'paypal' }, select: { id: true } })
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Subscription not found' })
  let sub = await syncPaypalSubscription(id)
  for (let i = 0; i < 4 && sub?.status === 'incomplete' && sub.providerStatus === 'ACTIVE'; i++) {
    await new Promise(r => setTimeout(r, 2000))
    sub = await syncPaypalSubscription(id)
  }
  await recordQuietly(sub)
  return sub
}

// Nightly (server/tasks/research/paypal-cleanup.ts): plans cancelled by the customer
// (suspended on PayPal) whose period is over are cancelled on PayPal for good; approvals
// never finished are given up.
export async function cleanUpPaypalSubscriptions() {
  const now = new Date()
  const ended = await prisma.subscription.findMany({
    where: { provider: 'paypal', providerStatus: 'SUSPENDED', cancelAtPeriodEnd: true, currentPeriodEnd: { lt: now } }
  })
  for (const s of ended) {
    try {
      await cancelRemote(s.stripeSubscriptionId, 'Cancelled by the customer')
      await syncPaypalSubscription(s.stripeSubscriptionId)
    } catch (err) {
      console.error('[paypal] cleanup: cancel failed', s.stripeSubscriptionId, err)
    }
  }
  // Cancelled from the PayPal account: kept 'active' until the paid period ran out.
  await prisma.subscription.updateMany({
    where: { provider: 'paypal', providerStatus: { in: ['CANCELLED', 'EXPIRED'] }, status: { in: ACCESS_STATUSES }, currentPeriodEnd: { lt: now } },
    data: { status: 'canceled', endedAt: now }
  })
  // Suspended by PayPal after failed payments (no access): ended, so it can't be billed
  // the outstanding amount later.
  const unpaid = await prisma.subscription.findMany({ where: { provider: 'paypal', status: 'unpaid' } })
  for (const s of unpaid) {
    try {
      await cancelRemote(s.stripeSubscriptionId, 'Payments failed')
      await prisma.subscription.update({ where: { id: s.id }, data: { status: 'canceled', providerStatus: 'CANCELLED', endedAt: now } })
    } catch (err) {
      console.error('[paypal] cleanup: cancel of an unpaid plan failed', s.stripeSubscriptionId, err)
    }
  }
  // Approvals never finished: synced once more first (one paid while our webhook was down
  // becomes a normal plan), then given up — marked first, so a late approval is refused by
  // syncPaypalSubscription — and cancelled on PayPal so the link stops working.
  const stale = await prisma.subscription.findMany({
    where: { provider: 'paypal', status: 'incomplete', createdAt: { lt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) } }
  })
  let expired = 0
  for (const s of stale) {
    try {
      const synced = await syncPaypalSubscription(s.stripeSubscriptionId)
      if (synced && synced.status !== 'incomplete') continue
      const { count } = await prisma.subscription.updateMany({ where: { id: s.id, status: 'incomplete' }, data: { status: 'incomplete_expired' } })
      if (!count) continue
      expired++
      await syncPaypalSubscription(s.stripeSubscriptionId)
    } catch (err) {
      console.error('[paypal] cleanup: given-up approval failed', s.stripeSubscriptionId, err)
    }
  }
  // Payments the webhook never brought (not set up, or down): read from PayPal.
  const live = await prisma.subscription.findMany({ where: { provider: 'paypal', status: { in: ACCESS_STATUSES } } })
  let paymentsRecorded = 0
  for (const s of live) {
    try {
      paymentsRecorded += await recordPaypalTransactions(s)
    } catch (err) {
      console.error('[paypal] cleanup: reading payments failed', s.stripeSubscriptionId, err)
    }
  }
  // Refunds PayPal refused earlier: once more, with the same key.
  const owed = await prisma.subscriptionInvoice.findMany({ where: { refundDue: { gt: 0 }, refundKey: { not: null } } })
  for (const inv of owed) {
    await refundInvoice(prisma, inv, inv.refundDue, inv.refundKey!, inv.refundedAmount === 0 && inv.refundDue >= inv.amount)
  }
  return { cancelled: ended.length + unpaid.length, expired, paymentsRecorded, expiredOrders: await expireAbandonedPaypalOrders(), refundsRetried: owed.length }
}
