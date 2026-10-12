const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const name = typeof body?.name === 'string' && body.name.trim() ? body.name.trim() : email.split('@')[0]

  if (!EMAIL_RE.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid email address' })
  }
  assertValidPassword(password)

  // Also catches the same Gmail inbox written differently (a.b@ vs ab@gmail.com).
  if (await isEmailTaken(email)) {
    throw createError({ statusCode: 409, statusMessage: 'Email already registered' })
  }

  const user = await prisma.user.create({
    data: {
      email,
      password: await hashPassword(password),
      name,
      role: 'USER',
      hasSetPassword: true
    }
  })

  // Signing up isn't blocked on it: the account works right away and the
  // dashboard keeps asking to confirm until the link is clicked.
  sendVerificationEmail(user, body?.locale).catch(err => console.error('[mail] verification email failed', err))

  const token = createUserToken(user.id)
  return { token, user: authUserPayload(user) }
})
