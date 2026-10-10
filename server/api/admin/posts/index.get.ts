// Guest posts / link inserts for admins. ?filter=review (default): PENDING, oldest first;
// ?filter=all: everything, newest first.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
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
  return { items }
})
