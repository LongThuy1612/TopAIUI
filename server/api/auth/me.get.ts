export default defineEventHandler(async (event) => {
  const { userId, issuedAt } = requireUserSession(event)

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || !isSessionUsable(user, issuedAt)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  return authUserPayload(user)
})
