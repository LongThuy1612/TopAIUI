// Every article (drafts too) for the admin CMS, newest first.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const items = await prisma.article.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 500,
    select: {
      id: true, slug: true, title: true, externalUrl: true, kind: true, status: true, authorName: true, publishedAt: true, updatedAt: true,
      _count: { select: { submissions: true } }
    }
  })
  return { items }
})
