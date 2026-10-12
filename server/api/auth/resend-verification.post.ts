// Dashboard banner → "Resend email" for a not-yet-confirmed address.
export default defineEventHandler(async (event) => {
  const userId = await requireActiveUser(event)
  const body = await readBody(event).catch(() => null)
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, email: true, emailVerified: true, verificationTokenExpiry: true }
  })
  if (user.emailVerified) return { alreadyVerified: true }
  if (sentRecently(user.verificationTokenExpiry, VERIFY_TOKEN_TTL_MS)) {
    throw createError({ statusCode: 429, statusMessage: 'Please wait a minute before requesting another email' })
  }

  try {
    await sendVerificationEmail(user, body?.locale)
  } catch (err) {
    console.error('[mail] verification email failed', err)
    throw createError({ statusCode: 502, statusMessage: 'Could not send the email. Please try again later.' })
  }
  return { sent: true }
})
