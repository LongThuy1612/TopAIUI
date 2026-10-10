// The logged-in user's guest posts / link inserts (Dashboard → Posts / Links), newest first.
export default defineEventHandler(async (event) => {
  const userId = await requireActiveUser(event)
  const [user, items] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { postCredits: true } }),
    prisma.postSubmission.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true, type: true, status: true, credits: true, title: true, excerpt: true, coverUrl: true,
        targetUrl: true, anchorText: true, note: true, articleId: true, adminNote: true,
        submittedAt: true, reviewedAt: true, createdAt: true,
        article: { select: { slug: true, title: true, status: true } }
      }
    })
  ])
  return {
    postCredits: user?.postCredits ?? 0,
    // Only a published article has a public link.
    items: items.map(s => ({ ...s, article: s.article?.status === 'PUBLISHED' ? { slug: s.article.slug, title: s.article.title } : null }))
  }
})
