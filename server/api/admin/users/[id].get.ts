export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN'])

  const user = await prisma.user.findFirst({
    where: { id: getRouterParam(event, 'id'), deletedAt: null },
    select: adminUserSelect
  })
  if (!user) throw createError({ statusCode: 404, statusMessage: 'User not found' })
  return user
})
