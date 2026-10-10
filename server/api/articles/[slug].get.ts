// One published article, rendered to HTML (shared/markdown.ts: raw HTML escaped, outside
// links get the configured rel).
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') ?? ''
  const article = await prisma.article.findFirst({
    where: { slug, status: 'PUBLISHED' },
    select: { ...articleCardSelect, content: true, updatedAt: true }
  })
  if (!article) throw createError({ statusCode: 404, statusMessage: 'Article not found' })
  const { content, ...rest } = article
  const related = await prisma.article.findMany({
    where: { status: 'PUBLISHED', slug: { not: slug } },
    orderBy: { publishedAt: 'desc' },
    take: 5,
    select: { slug: true, title: true, publishedAt: true }
  })
  return { ...rest, excerpt: rest.excerpt || autoExcerpt(content), html: articleRenderer().render(content), related }
})
