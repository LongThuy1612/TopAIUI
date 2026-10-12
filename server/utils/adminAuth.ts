import type { H3Event } from 'h3'
import type { Role } from '@prisma/client'

// Loads the logged-in user (x-user-token) and checks their role in the DB.
// Throws 401 when not logged in / banned, 403 when the role is not allowed.
export async function requireRole(event: H3Event, roles: Role[]) {
  const { userId, issuedAt } = requireUserSession(event)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isBanned: true, deletedAt: true, passwordChangedAt: true }
  })
  if (!user || !isSessionUsable(user, issuedAt)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  if (!roles.includes(user.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  return user
}

// Admin-only endpoints. Two ways in:
//  - a logged-in user whose role is ADMIN (the dashboard UI), or
//  - the shared `x-admin-token` (ADMIN_TOKEN) — kept for server-to-server
//    callers such as the crawl scripts that post to /api/toolify and /api/ph.
export async function requireAdmin(event: H3Event) {
  const adminToken = getHeader(event, 'x-admin-token')
  if (adminToken && adminToken === useRuntimeConfig().adminToken) return

  await requireRole(event, ['ADMIN'])
}
