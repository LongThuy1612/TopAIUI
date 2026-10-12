// Admin: delete a contact message (spam, duplicates).
export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN'])
  const id = getRouterParam(event, 'id')!
  const { count } = await prisma.contactMessage.deleteMany({ where: { id } })
  if (!count) throw createError({ statusCode: 404, statusMessage: 'Message not found' })
  return { ok: true }
})
