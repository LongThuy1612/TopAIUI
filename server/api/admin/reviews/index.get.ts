import type { Prisma } from '@prisma/client'

// Review Manager list. Filter by status and search by comment / tool / user.
export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN'])

  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 50))

  const where: Prisma.ReviewWhereInput = {}
  if (REVIEW_STATUSES.includes(String(query.status) as ReviewStatus)) where.status = String(query.status)
  if (query.q) {
    const q = String(query.q).trim()
    where.OR = [
      { comment: { contains: q, mode: 'insensitive' } },
      { tool: { name: { contains: q, mode: 'insensitive' } } },
      { user: { email: { contains: q, mode: 'insensitive' } } },
      { user: { name: { contains: q, mode: 'insensitive' } } }
    ]
  }

  const [items, total, pendingCount] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        rating: true,
        comment: true,
        status: true,
        locale: true,
        createdAt: true,
        userInfo: true,
        tool: { select: { id: true, name: true, slug: true } },
        user: { select: { id: true, name: true, email: true } }
      }
    }),
    prisma.review.count({ where }),
    prisma.review.count({ where: { status: 'PENDING' } })
  ])

  return { items, total, pendingCount, page, pageCount: Math.max(1, Math.ceil(total / limit)) }
})
