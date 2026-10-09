// GET /api/promote/session/:sessionId → { status, type, toolId }
// Polled by a promote page after Stripe sends the buyer back (?session_id=…), so a
// "Submit AI" buyer can be taken straight to their new tool. The webhook normally
// fulfils the order first; if it hasn't arrived yet (or isn't configured, e.g. local
// dev without `stripe listen`), ask Stripe directly and fulfil here —
// fulfillPromoteOrder is idempotent, whichever caller gets there first does the work.
export default defineEventHandler(async (event) => {
  const userId = await requireActiveUser(event)
  const sessionId = getRouterParam(event, 'id') ?? ''

  const find = () => prisma.promoteOrder.findFirst({
    where: { stripeSessionId: sessionId, userId },
    select: { status: true, type: true, toolId: true }
  })

  let order = await find()
  if (!order) throw createError({ statusCode: 404, statusMessage: 'Order not found' })

  if (order.status === 'PENDING' && !sessionId.startsWith('fake_')) {
    const session = await useStripe().checkout.sessions.retrieve(sessionId).catch(() => null)
    if (session?.payment_status === 'paid') {
      await fulfillPromoteOrder(sessionId)
      order = await find()
    }
  }

  return order
})
