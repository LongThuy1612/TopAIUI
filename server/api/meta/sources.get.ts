export default defineEventHandler(async () => {
  const rows = await prisma.tool.groupBy({
    by: ['source'],
    where: { status: 'PUBLISHED', deletedAt: null, source: { not: null } },
    _count: { source: true },
    orderBy: { _count: { source: 'desc' } }
  })

  return rows.map((r) => ({ value: r.source as string, count: r._count.source }))
})
