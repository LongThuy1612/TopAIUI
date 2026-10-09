// DELETE /api/social-queries/<id> — frees its slot.
export default defineEventHandler(async (event) => {
  const userId = await requireActiveUser(event)
  const q = await ownQuery(userId, getRouterParam(event, 'id') ?? '')
  await prisma.socialQuery.delete({ where: { id: q.id } })
  return { ok: true }
})
