import type { Prisma } from '@prisma/client'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const query = getQuery(event)
  const where: Prisma.ToolWhereInput = {}
  if (query.status) where.status = String(query.status) as Prisma.ToolWhereInput['status']
  if (query.isApproved === 'false') where.isApproved = false
  if (query.q) {
    const q = String(query.q)
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { slug: { contains: q, mode: 'insensitive' } }
    ]
  }

  const items = await prisma.tool.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50, include: { categories: true } })
  return { items }
})
