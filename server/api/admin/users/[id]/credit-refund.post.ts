// POST { orderId, credits, amount } — refunds that order's unused guest-post credits.
// credits / amount: the figures the admin confirmed (refused if they changed meanwhile).
export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN'])
  const body = await readBody<{ orderId?: unknown; credits?: unknown; amount?: unknown }>(event)
  const orderId = typeof body?.orderId === 'string' ? body.orderId : ''
  const credits = Number(body?.credits)
  const amount = Number(body?.amount)
  if (!orderId || !Number.isInteger(credits) || !Number.isInteger(amount)) {
    throw createError({ statusCode: 400, statusMessage: 'orderId, credits and amount are required' })
  }
  return refundUnusedCredits(getRouterParam(event, 'id') ?? '', orderId, { credits, amount })
})
