// Dashboard → change password (or set a first one on a Google-only account).
// Signs out every other session; this one gets a fresh token back.
export default defineEventHandler(async (event) => {
  const { userId, issuedAt } = requireUserSession(event)
  const body = await readBody(event)
  const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : ''
  const newPassword = body?.newPassword
  assertValidPassword(newPassword)

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || !isSessionUsable(user, issuedAt)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  if (user.password && !(await verifyPassword(currentPassword, user.password))) {
    throw createError({ statusCode: 422, statusMessage: 'Current password is incorrect' })
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      password: await hashPassword(newPassword),
      hasSetPassword: true,
      passwordChangedAt: new Date(),
      // A reset link still in someone's inbox shouldn't outlive this change.
      passwordResetToken: null,
      passwordResetTokenExpiry: null
    }
  })

  return { token: createUserToken(updated.id), user: authUserPayload(updated) }
})
