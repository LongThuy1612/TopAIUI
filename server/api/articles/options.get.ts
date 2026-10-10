// Published articles to pick from when ordering a link insert (title + id only).
export default defineEventHandler(async (event) => {
  await requireActiveUser(event)
  return prisma.article.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { publishedAt: 'desc' },
    take: 500,
    select: { id: true, title: true, slug: true }
  })
})
