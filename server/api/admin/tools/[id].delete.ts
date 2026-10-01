export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing tool id' })
  }

  const tool = await prisma.tool.findUnique({ where: { id }, select: { id: true } })
  if (!tool) {
    throw createError({ statusCode: 404, statusMessage: 'Tool not found' })
  }

  // These child tables reference Tool with ON DELETE RESTRICT, so they must
  // be removed first (categories / tags are join tables and cascade).
  await prisma.$transaction([
    prisma.review.deleteMany({ where: { toolId: id } }),
    prisma.toolTranslation.deleteMany({ where: { toolId: id } }),
    prisma.faq.deleteMany({ where: { toolId: id } }),
    prisma.feature.deleteMany({ where: { toolId: id } }),
    prisma.pricingPlan.deleteMany({ where: { toolId: id } }),
    prisma.tool.delete({ where: { id } })
  ])

  return { ok: true }
})
