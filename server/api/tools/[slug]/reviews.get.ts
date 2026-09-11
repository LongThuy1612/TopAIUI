export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(50, Number(query.limit) || 10)
  const orderDir = query.sort === 'oldest' ? 'asc' : 'desc'

  const where = { tool: { slug }, status: 'APPROVED' } as const

  const [items, total] = await Promise.all([
    prisma.review.findMany({
      where,
      select: { rating: true, comment: true, createdAt: true, user: { select: { name: true } } },
      orderBy: { createdAt: orderDir },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.review.count({ where })
  ])

  return {
    items: items.map((r) => ({ rating: r.rating, comment: r.comment, createdAt: r.createdAt, userName: r.user?.name ?? null })),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / limit))
  }
})
