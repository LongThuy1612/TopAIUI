// Published articles to pick from when ordering a link insert (title + id only).
export default defineEventHandler(async (event) => {
  await requireActiveUser(event)
  return prisma.article.findMany({
    where: { status: 'PUBLISHED', externalUrl: null }, // link items have no text to put a link in
    orderBy: { publishedAt: 'desc' },
    take: 500,
    select: { id: true, title: true, slug: true }
  })
})
