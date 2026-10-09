// POST /api/billing/cancel { cancel: boolean }
// true: the plan stops at the end of the paid period (access until then); false: undo.
export default defineEventHandler(async (event) => {
  const userId = await requireActiveUser(event)
  const body = await readBody<{ cancel?: unknown }>(event)
  if (typeof body?.cancel !== 'boolean') throw createError({ statusCode: 400, statusMessage: 'Invalid request' })
  const sub = await setCancelAtPeriodEnd(userId, body.cancel)
  return { cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? body.cancel }
})
