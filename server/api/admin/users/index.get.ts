import type { Prisma, Role } from '@prisma/client'

// User Management list. Real ADMIN users only — the shared ADMIN_TOKEN used by
// crawl scripts is deliberately NOT accepted here.
export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN'])

  const query = getQuery(event)
  const where: Prisma.UserWhereInput = { deletedAt: null }
  if (query.role && ROLES.includes(String(query.role) as Role)) where.role = String(query.role) as Role
  if (query.banned === 'true') where.isBanned = true
  if (query.q) {
    const q = String(query.q).trim()
    where.OR = [
      { email: { contains: q, mode: 'insensitive' } },
      { name: { contains: q, mode: 'insensitive' } }
    ]
  }

  const [items, total] = await Promise.all([
    prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100, select: adminUserSelect }),
    prisma.user.count({ where })
  ])
  return { items, total }
})
