// Delete an article. One that customers paid for (a published guest post / link insert)
// can't be deleted, only set back to draft — the customer's dashboard still points at it.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id') ?? ''
  return prisma.$transaction(async (tx) => {
    // Row lock: a link insert being marked done on this article waits (or goes first).
    const found = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Article" WHERE id = ${id} FOR UPDATE`
    if (!found.length) throw createError({ statusCode: 404, statusMessage: 'Article not found' })
    const paid = await tx.postSubmission.count({ where: { articleId: id, status: 'PUBLISHED' } })
    if (paid) {
      throw createError({ statusCode: 409, statusMessage: 'Conflict', message: 'Customers paid for this article (guest post / link insert). Set it to draft instead.' })
    }
    await tx.article.delete({ where: { id } })
    return { id }
  })
})
