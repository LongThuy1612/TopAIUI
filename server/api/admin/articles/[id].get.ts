// One article with its raw Markdown, for the admin editor, plus the submissions tied to it.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const article = await prisma.article.findUnique({
    where: { id: getRouterParam(event, 'id') ?? '' },
    include: { submissions: { select: { id: true, type: true, status: true, targetUrl: true, anchorText: true, user: { select: { email: true } } } } }
  })
  if (!article) throw createError({ statusCode: 404, statusMessage: 'Article not found' })
  return article
})
