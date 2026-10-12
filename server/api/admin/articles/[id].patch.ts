// Save the admin editor. Publishing sets publishedAt the first time; going back to draft
// keeps it (re-publishing doesn't bump an old article to the top of /ai-news).
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id') ?? ''
  const input = cleanArticleInput(await readBody<Record<string, unknown>>(event) ?? {})
  return prisma.$transaction(async (tx) => {
    await lockArticleSlugs(tx)
    const article = await tx.article.findUnique({ where: { id }, select: { slug: true, publishedAt: true, externalUrl: true, _count: { select: { submissions: true } } } })
    if (!article) throw createError({ statusCode: 404, statusMessage: 'Article not found' })
    // Link inserts live in the text of our own page; a link item has none.
    if (input.externalUrl && !article.externalUrl && article._count.submissions) {
      throw createError({ statusCode: 409, statusMessage: 'Conflict', message: 'This article has link inserts / a guest post tied to it, so it cannot become a link item.' })
    }
    const slug = input.slug || article.slug
    if (slug !== article.slug && await tx.article.findFirst({ where: { slug, id: { not: id } }, select: { id: true } })) {
      throw createError({ statusCode: 409, statusMessage: 'Conflict', message: 'Another article already uses that slug.' })
    }
    return tx.article.update({
      where: { id },
      data: { ...input, slug, publishedAt: article.publishedAt ?? (input.status === 'PUBLISHED' ? new Date() : null) },
      select: { id: true, slug: true }
    })
  })
})
