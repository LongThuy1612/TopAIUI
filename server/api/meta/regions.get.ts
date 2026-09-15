export default defineEventHandler(async () => {
  const rows = await prisma.tool.groupBy({
    by: ['region'],
    where: { status: 'PUBLISHED', deletedAt: null, region: { not: null } },
    _count: { region: true },
    orderBy: { _count: { region: 'desc' } }
  })

  return rows.map((r) => ({ value: r.region as string, count: r._count.region }))
})
