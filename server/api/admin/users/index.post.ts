import type { Role } from '@prisma/client'

// Create a user from User Management (any role). ADMIN users only.
export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN'])

  const body = await readBody(event)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const name = typeof body?.name === 'string' && body.name.trim() ? body.name.trim() : email.split('@')[0]
  const role = ROLES.includes(body?.role) ? (body.role as Role) : 'USER'

  if (!EMAIL_RE.test(email)) throw badRequest('Invalid email address')
  if (password.length < 6) throw badRequest('Password must be at least 6 characters')

  if (await isEmailTaken(email)) {
    throw createError({ statusCode: 409, statusMessage: 'Email already registered', message: 'Email already registered' })
  }

  return prisma.user.create({
    data: { email, name, role, password: await hashPassword(password), hasSetPassword: true },
    select: adminUserSelect
  })
})
