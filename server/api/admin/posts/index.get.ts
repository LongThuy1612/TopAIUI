// Guest posts / link inserts for admins. ?filter=review (default): PENDING, oldest first;
// ?filter=all: everything, newest first.
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
  if (getQuery(event).only === 'counts') return { counts: await statusCounts('postSubmission') }
  const review = String(getQuery(event).filter ?? 'review') === 'review'
  const items = await prisma.postSubmission.findMany({
    where: review ? { status: 'PENDING' } : {},
    orderBy: { submittedAt: review ? 'asc' : 'desc' },
    take: 200,
    // The full text only for the review queue (preview, word / link counts).
    omit: review ? undefined : { content: true },
    include: {
      user: { select: { email: true, name: true } },
      article: { select: { id: true, slug: true, title: true, status: true } }
    }
  })
  // The "all" list leaves the text out, but its PENDING rows can still be previewed and
  // reviewed there: give those (few) their text.
  if (!review) {
    const pendingIds = items.filter(s => s.status === 'PENDING').map(s => s.id)
    if (pendingIds.length) {
      const texts = new Map((await prisma.postSubmission.findMany({ where: { id: { in: pendingIds } }, select: { id: true, content: true } })).map(r => [r.id, r.content]))
      return { items: items.map(s => (texts.has(s.id) ? { ...s, content: texts.get(s.id) ?? null } : s)) }
    }
  }
  return { items }
})
