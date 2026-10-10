// GPTs for admins. ?filter=review (default): waiting for a decision, oldest first;
// ?filter=all: everything, newest first. `duplicates`: other GPTs with the same link.
// ?only=counts → just { counts: { STATUS: n } } over the whole table (dashboard tiles),
// instead of downloading a capped list to count it.
async function statusCounts(model: 'postSubmission' | 'gpt') {
  const rows = model === 'gpt'
    ? await prisma.gpt.groupBy({ by: ['status'], _count: { _all: true } })
    : await prisma.postSubmission.groupBy({ by: ['status'], _count: { _all: true } })
  return Object.fromEntries(rows.map(r => [r.status, r._count._all])) as Record<string, number>
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  await ensureGptsForPaidOrders()
  if (getQuery(event).only === 'counts') return { counts: await statusCounts('gpt') }
  const review = String(getQuery(event).filter ?? 'review') === 'review'
  const items = await prisma.gpt.findMany({
    where: review ? { status: 'PENDING' } : {},
    orderBy: { createdAt: review ? 'asc' : 'desc' },
    take: 300,
    include: { owner: { select: { email: true } } }
  })
  const gizmos = [...new Set(items.map(g => g.gizmoId).filter(Boolean))]
  const all = await prisma.gpt.findMany({ where: { gizmoId: { in: gizmos }, status: { not: 'REJECTED' } }, select: { id: true, gizmoId: true } })
  return {
    items: items.map(g => ({ ...g, duplicates: g.gizmoId ? all.filter(o => o.gizmoId === g.gizmoId && o.id !== g.id).length : 0 }))
  }
})
