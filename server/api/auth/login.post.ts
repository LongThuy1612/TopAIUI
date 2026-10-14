export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!email || !password) {
    throw createError({ statusCode: 400, statusMessage: 'Email and password are required' })
  }

  assertLoginAllowed(event, email)
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.password || !(await verifyPassword(password, user.password))) {
    noteLoginFailure(event, email)
    throw createError({ statusCode: 401, statusMessage: 'Invalid email or password' })
  }
  clearLoginFailures(event, email)
  if (user.isBanned || user.deletedAt) {
    throw createError({ statusCode: 403, statusMessage: 'This account has been banned' })
  }

  const token = createUserToken(user.id)
  return { token, user: authUserPayload(user) }
})
