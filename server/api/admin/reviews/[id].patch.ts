// Approve / reject (or move back to pending) a review, then refresh the tool's
// rating aggregates since they only count APPROVED reviews.
export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN'])
  const id = getRouterParam(event, 'id')!
  const body = await readBody<{ status?: string }>(event)

  const status = String(body?.status) as ReviewStatus
  if (!REVIEW_STATUSES.includes(status)) throw badRequest('Invalid status')

  const review = await prisma.review.findUnique({ where: { id }, select: { toolId: true, userId: true } })
  if (!review) throw createError({ statusCode: 404, statusMessage: 'Review not found' })

  const updated = await prisma.$transaction(async (tx) => {
    // Re-activating an old rejected review must not give the user a second
    // active review if they have since written a new one.
    if (review.userId && ACTIVE_REVIEW_STATUSES.includes(status)) {
      await lockReviewKey(tx, `user-tool:${review.userId}:${review.toolId}`)
      if (await findOtherActiveReview(tx, review.userId, review.toolId, id)) {
        throw createError({
          statusCode: 409,
          statusMessage: 'This user already has another pending or approved review for this tool',
          message: 'This user already has another pending or approved review for this tool'
        })
      }
    }
    // updateMany so a review deleted meanwhile by another admin gives 404, not a 500.
    const { count } = await tx.review.updateMany({ where: { id }, data: { status } })
    if (!count) throw createError({ statusCode: 404, statusMessage: 'Review not found' })
    return { id, status }
  })

  await recalcToolRating(review.toolId)
  return updated
})
