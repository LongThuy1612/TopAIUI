// GET /api/billing/session/<Stripe checkout session id | PayPal subscription id (I-…)>
// Called when Stripe / PayPal sends the buyer back to the dashboard: mirrors the new
// subscription at once (the webhook does the same, whichever comes first).
export default defineEventHandler(async (event) => {
  const userId = await requireActiveUser(event)
  const id = getRouterParam(event, 'id') ?? ''
  const sub = id.startsWith('I-') ? await syncPaypalReturn(userId, id) : await syncCheckoutSession(userId, id)
  return { plan: sub?.plan ?? null }
})
