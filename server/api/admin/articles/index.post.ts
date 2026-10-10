// Create an editorial article (draft or published right away).
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const input = cleanArticleInput(await readBody<Record<string, unknown>>(event) ?? {})
  return prisma.$transaction(async (tx) => {
    await lockArticleSlugs(tx)
    if (input.slug && await tx.article.findUnique({ where: { slug: input.slug }, select: { id: true } })) {
      throw createError({ statusCode: 409, statusMessage: 'Conflict', message: 'Another article already uses that slug.' })
    }
    return tx.article.create({
      data: {
        ...input,
        slug: input.slug || await uniqueArticleSlug(tx, input.title),
        kind: 'EDITORIAL',
        publishedAt: input.status === 'PUBLISHED' ? new Date() : null
      },
      select: { id: true, slug: true }
    })
  })
})
