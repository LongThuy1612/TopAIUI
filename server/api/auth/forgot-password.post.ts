// "Forgot your password?": emails a one-time reset link. Tells the user when no
// account uses the address — sign-up already reveals that ("Email already
// registered"), so hiding it here protected nothing and only confused people.
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!EMAIL_RE.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid email address' })
  }

  const select = { id: true, email: true, isBanned: true, deletedAt: true, passwordResetTokenExpiry: true } as const
  let user = await prisma.user.findUnique({ where: { email }, select })
  // Same Gmail inbox written differently (a.b@ vs ab@gmail.com): sign-up treats
  // it as taken, so it must not be "not registered" here. The link goes to the
  // address on the account.
  if (!user) {
    const ids = await findSameGmailMailbox(email)
    if (ids.length === 1) user = await prisma.user.findUnique({ where: { id: ids[0]! }, select })
  }

  if (!user || user.deletedAt) {
    throw createError({ statusCode: 404, statusMessage: 'No account is registered with this email' })
  }
  if (user.isBanned) {
    throw createError({ statusCode: 403, statusMessage: 'This account has been banned' })
  }
  if (sentRecently(user.passwordResetTokenExpiry, RESET_TOKEN_TTL_MS)) {
    throw createError({ statusCode: 429, statusMessage: 'Please wait a minute before requesting another email' })
  }

  // Google-only accounts get one too: resetting is how they add a password.
  try {
    await sendPasswordResetEmail(user, body?.locale)
  } catch (err) {
    console.error('[mail] password reset email failed', err)
    throw createError({ statusCode: 502, statusMessage: 'Could not send the email. Please try again later.' })
  }

  return { ok: true }
})
