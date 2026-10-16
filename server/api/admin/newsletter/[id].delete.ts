// Admin → Newsletter: remove an address (someone asked to be taken off the list).
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { count } = await prisma.newsletterSubscriber.deleteMany({ where: { id: getRouterParam(event, 'id') ?? '' } })
  if (!count) throw createError({ statusCode: 404, statusMessage: 'Subscriber not found' })
  return { ok: true }
})
