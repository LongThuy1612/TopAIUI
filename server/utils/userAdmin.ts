import type { Prisma, Role } from '@prisma/client'

// Fields the User Management UI may see — never the password hash or tokens.
export const adminUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  isBanned: true,
  emailVerified: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { promoteOrders: true } }
} satisfies Prisma.UserSelect

export const ROLES: Role[] = ['USER', 'MANAGER', 'ADMIN']
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Active admins other than `excludeId`. Used to stop an action (demote, ban,
// delete) from leaving the site with no admin at all.
export function countOtherActiveAdmins(excludeId: string) {
  return prisma.user.count({
    where: { role: 'ADMIN', isBanned: false, deletedAt: null, id: { not: excludeId } }
  })
}

export function badRequest(message: string) {
  return createError({ statusCode: 400, statusMessage: message, message })
}
