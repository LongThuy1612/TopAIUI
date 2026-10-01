// Permanently delete a review (spam etc.) and refresh the tool's rating.
export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN'])
  const id = getRouterParam(event, 'id')!

  const review = await prisma.review.findUnique({ where: { id }, select: { toolId: true } })
  if (!review) throw createError({ statusCode: 404, statusMessage: 'Review not found' })

  // deleteMany so a concurrent delete by another admin gives 404, not a 500.
  const { count } = await prisma.review.deleteMany({ where: { id } })
  if (!count) throw createError({ statusCode: 404, statusMessage: 'Review not found' })

  await recalcToolRating(review.toolId)
  return { ok: true }
})
