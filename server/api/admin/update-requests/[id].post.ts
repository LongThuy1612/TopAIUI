// Review a paid update: { action: 'apply' } writes the changes to the live tool;
// { action: 'reject', reason } refunds the order through Stripe.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id') ?? ''
  const body = await readBody<{ action?: string; reason?: string }>(event)
  const bad = (message: string) => createError({ statusCode: 400, statusMessage: message, message })

  if (body?.action === 'apply') return applyUpdateRequest(id)
  if (body?.action === 'reject') {
    const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 2000) : ''
    if (!reason) throw bad('A reason is required.')
    return rejectUpdateRequest(id, reason)
  }
  throw bad('Unknown action.')
})
