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

  // Ad campaigns go with the tool (cascade) — refuse while one still holds paid clicks,
  // so an advertiser's balance is never wiped without being dealt with first.
  const ads = await prisma.adCampaign.aggregate({
    where: { toolId: id, status: { not: 'REJECTED' }, clicksRemaining: { gt: 0 } },
    _sum: { clicksRemaining: true },
    _count: true
  })
  if (ads._count) {
    const message = `This tool has ${ads._count} ad campaign(s) with ${ads._sum.clicksRemaining} unused paid clicks. Settle them with the advertiser (or unpublish the tool instead) before deleting it.`
    throw createError({ statusCode: 409, statusMessage: 'Tool has paid ad clicks', message })
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
