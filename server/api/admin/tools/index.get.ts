import type { Prisma } from '@prisma/client'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const query = getQuery(event)
  const where: Prisma.ToolWhereInput = {}
  if (query.status) where.status = String(query.status) as Prisma.ToolWhereInput['status']

  const items = await prisma.tool.findMany({ where, orderBy: { createdAt: 'desc' }, include: { categories: true } })
  return { items }
})
