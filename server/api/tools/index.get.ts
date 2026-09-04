import type { Prisma } from '@prisma/client'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(60, Number(query.limit) || 24)

  // status is hardcoded to 'PUBLISHED' — this endpoint never leaks pending
  // (unapproved) submissions to the public. Admin-only visibility lives in
  // server/api/admin/tools/index.get.ts instead.
  const where: Prisma.ToolWhereInput = { status: 'PUBLISHED' }
  if (query.category) where.categories = { some: { slug: String(query.category) } }
  if (query.pricing) where.pricingType = String(query.pricing) as Prisma.ToolWhereInput['pricingType']
  if (query.featured === 'true') where.isFeatured = true
  if (query.q) {
    where.name = { contains: String(query.q), mode: 'insensitive' }
  }

  const sortMap: Record<string, Prisma.ToolOrderByWithRelationInput | Prisma.ToolOrderByWithRelationInput[]> = {
    newest: { createdAt: 'desc' },
    featured: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    name: { name: 'asc' }
  }
  const orderBy = sortMap[String(query.sort)] ?? sortMap.newest

  const [items, total] = await Promise.all([
    prisma.tool.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit, include: { categories: true } }),
    prisma.tool.count({ where })
  ])

  return { items, total, page, pageCount: Math.ceil(total / limit) }
})
