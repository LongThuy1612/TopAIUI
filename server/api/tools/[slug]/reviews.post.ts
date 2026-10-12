// Submit a review for a tool. Login required; the review is saved as PENDING
// and only shows on the tool page after an admin approves it.
export default defineEventHandler(async (event) => {
  const userId = await requireActiveUser(event)
  const slug = getRouterParam(event, 'slug')
  const body = await readBody<{ rating?: number; comment?: string; locale?: string }>(event)

  // Only a number or numeric string — not `true`, `[5]` etc. that Number() would coerce.
  const rawRating = body?.rating as unknown
  const rating = typeof rawRating === 'number' || typeof rawRating === 'string' ? Number(rawRating) : NaN
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw badRequest('Rating must be between 1 and 5')

  const comment = typeof body?.comment === 'string' ? body.comment.trim() : ''
  if (!comment) throw badRequest('Comment is required')
  if (comment.length > REVIEW_COMMENT_MAX) throw badRequest(`Comment must be at most ${REVIEW_COMMENT_MAX} characters`)

  // Same visibility as the public tool page: drafts / deleted tools can't be reviewed.
  const tool = await prisma.tool.findFirst({ where: { slug, status: 'PUBLISHED', deletedAt: null }, select: { id: true } })
  if (!tool) throw createError({ statusCode: 404, statusMessage: `Tool "${slug}" not found` })

  // One active review per user per tool; a rejected one may be resubmitted.
  // Locked so concurrent submits (two tabs, double click) can't both pass the check.
  return prisma.$transaction(async (tx) => {
    await lockReviewKey(tx, `user-tool:${userId}:${tool.id}`)
    if (await findOtherActiveReview(tx, userId, tool.id)) throw alreadyReviewedError()

    return tx.review.create({
      data: {
        rating,
        comment,
        toolId: tool.id,
        userId,
        locale: typeof body?.locale === 'string' && body.locale ? body.locale.slice(0, 10) : 'en',
        status: 'PENDING'
      },
      select: { id: true, status: true }
    })
  })
})
