export default defineEventHandler(async (event) => {
  const userId = requireUser(event)

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.isBanned || user.deletedAt) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  return { id: user.id, email: user.email, name: user.name, role: user.role }
})
