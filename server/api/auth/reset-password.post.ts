// Sets a new password from an emailed reset link and signs the user in.
// Every other session ends (passwordChangedAt), and the address counts as
// verified: only its owner could open the link.
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const token = typeof body?.token === 'string' ? body.token : ''
  const password = body?.password
  assertValidPassword(password)

  const invalid = () => createError({ statusCode: 400, statusMessage: 'This reset link is invalid or has expired' })
  if (!token) throw invalid()

  const hash = hashEmailToken(token)
  const user = await prisma.user.findFirst({
    where: { passwordResetToken: hash, passwordResetTokenExpiry: { gt: new Date() } },
    select: { id: true, isBanned: true, deletedAt: true }
  })
  if (!user) throw invalid()
  if (user.isBanned || user.deletedAt) {
    throw createError({ statusCode: 403, statusMessage: 'This account has been banned' })
  }

  // Conditional on the token so two submits of the same link can't both win.
  const { count } = await prisma.user.updateMany({
    where: { id: user.id, passwordResetToken: hash },
    data: {
      password: await hashPassword(password),
      hasSetPassword: true,
      passwordChangedAt: new Date(),
      passwordResetToken: null,
      passwordResetTokenExpiry: null,
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpiry: null
    }
  })
  if (!count) throw invalid()

  const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
  return { token: createUserToken(updated.id), user: authUserPayload(updated) }
})
