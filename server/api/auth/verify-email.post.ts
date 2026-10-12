// Confirms the address from the emailed link. The click must come from the
// account's own session: otherwise someone could register the victim's address
// with a password of their own, and the victim — clicking an unsolicited
// "confirm" email — would mark that account verified, which keeps the
// stranger's password working after the victim later signs in with Google
// (see google.post.ts, which only drops passwords on unverified accounts).
export default defineEventHandler(async (event) => {
  const userId = await requireActiveUser(event)
  const body = await readBody(event)
  const token = typeof body?.token === 'string' ? body.token : ''
  const invalid = () => createError({ statusCode: 400, statusMessage: 'This confirmation link is invalid or has expired' })
  if (!token) throw invalid()

  const hash = hashEmailToken(token)
  const owner = await prisma.user.findFirst({
    where: { verificationToken: hash, verificationTokenExpiry: { gt: new Date() } },
    select: { id: true }
  })
  if (!owner) {
    // Link clicked again after it worked (token already cleared): not an error.
    const me = await prisma.user.findUnique({ where: { id: userId }, select: { emailVerified: true } })
    if (me?.emailVerified) return { ok: true }
    throw invalid()
  }
  if (owner.id !== userId) {
    throw createError({ statusCode: 403, statusMessage: 'This link belongs to a different account' })
  }

  // Conditional on the token: a newer email (resend) replaces it.
  const { count } = await prisma.user.updateMany({
    where: { id: userId, verificationToken: hash },
    data: { emailVerified: true, verificationToken: null, verificationTokenExpiry: null }
  })
  if (!count) throw invalid()

  return { ok: true }
})
