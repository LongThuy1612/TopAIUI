// The user's guest-post credit orders and what each could refund right now.
export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN'])
  return creditOrdersOf(getRouterParam(event, 'id') ?? '')
})
