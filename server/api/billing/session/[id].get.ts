// GET /api/billing/session/<Stripe checkout session id | PayPal subscription id (I-…)>
// Called when Stripe / PayPal sends the buyer back to the dashboard: mirrors the new
// subscription at once (the webhook does the same, whichever comes first).
export default defineEventHandler(async (event) => {
  const userId = await requireActiveUser(event)
  const id = getRouterParam(event, 'id') ?? ''
  const sub = id.startsWith('I-') ? await syncPaypalReturn(userId, id) : await syncCheckoutSession(userId, id)
  // Only a plan that gives access: an approval not paid yet (or whose first payment failed)
  // is still an 'incomplete' row with a plan on it.
  return { plan: sub && ACCESS_STATUSES.includes(sub.status) ? sub.plan : null }
})
