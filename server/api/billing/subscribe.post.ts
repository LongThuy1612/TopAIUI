// POST /api/billing/subscribe { plan: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE', interval: 'MONTH' | 'YEAR' }
// Free user → { checkoutUrl } (Stripe Checkout, subscription mode). On a plan already →
// the plan is changed in place (Stripe prorates) → { changed: true }.
import { isResearchPlan, isBillingInterval } from '#shared/research'

export default defineEventHandler(async (event) => {
  const userId = await requireActiveUser(event)
  const body = await readBody<{ plan?: unknown; interval?: unknown; locale?: unknown }>(event)
  if (!isResearchPlan(body?.plan) || !isBillingInterval(body?.interval)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid plan.', message: 'Invalid plan.' })
  }
  return subscribe(userId, body.plan, body.interval, body.locale)
})
