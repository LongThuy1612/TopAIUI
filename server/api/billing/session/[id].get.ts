// GET /api/billing/session/<checkout session id>
// Called when Stripe sends the buyer back to the dashboard: mirrors the new subscription
// at once (the webhook does the same, whichever comes first).
export default defineEventHandler(async (event) => {
  const userId = await requireActiveUser(event)
  const sub = await syncCheckoutSession(userId, getRouterParam(event, 'id') ?? '')
  return { plan: sub?.plan ?? null }
})
