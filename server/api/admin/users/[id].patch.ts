import type { Prisma, Role } from '@prisma/client'

// Edit a user: name, email, role, banned flag, and optionally a new password.
// Guards: an admin cannot demote/ban themselves, and the last active admin
// can never be demoted or banned.
export default defineEventHandler(async (event) => {
  const me = await requireRole(event, ['ADMIN'])
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)

  const target = await prisma.user.findFirst({ where: { id, deletedAt: null } })
  if (!target) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  const data: Prisma.UserUpdateInput = {}

  if (typeof body?.name === 'string') data.name = body.name.trim() || null

  if (typeof body?.email === 'string') {
    const email = body.email.trim().toLowerCase()
    if (!EMAIL_RE.test(email)) throw badRequest('Invalid email address')
    if (email !== target.email) {
      if (await isEmailTaken(email, target.id)) {
        throw createError({ statusCode: 409, statusMessage: 'Email already registered', message: 'Email already registered' })
      }
      data.email = email
      // Nobody has proven the new address yet, and links already mailed to the
      // old one must not keep working for the account.
      data.emailVerified = false
      data.verificationToken = null
      data.verificationTokenExpiry = null
      data.passwordResetToken = null
      data.passwordResetTokenExpiry = null
    }
  }

  if (typeof body?.password === 'string' && body.password !== '') {
    if (body.password.length < 6) throw badRequest('Password must be at least 6 characters')
    data.password = await hashPassword(body.password)
    data.hasSetPassword = true
    data.passwordChangedAt = new Date()
  }

  const newRole = body?.role !== undefined ? body.role : undefined
  if (newRole !== undefined) {
    if (!ROLES.includes(newRole)) throw badRequest('Invalid role')
    data.role = newRole as Role
  }
  const newBanned = typeof body?.isBanned === 'boolean' ? body.isBanned : undefined
  if (newBanned !== undefined) data.isBanned = newBanned

  const losesAdmin = target.role === 'ADMIN' && !target.isBanned &&
    ((data.role !== undefined && data.role !== 'ADMIN') || newBanned === true)
  if (losesAdmin) {
    if (target.id === me.id) throw badRequest('You cannot remove your own admin access')
    if (await countOtherActiveAdmins(target.id) === 0) throw badRequest('At least one active admin is required')
  }
  if (newBanned === true && target.id === me.id) throw badRequest('You cannot ban yourself')

  return prisma.user.update({ where: { id }, data, select: adminUserSelect })
})
