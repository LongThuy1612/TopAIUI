// One of the user's submissions with its full text, for the edit forms.
export default defineEventHandler(async (event) => {
  const userId = await requireActiveUser(event)
  const sub = await prisma.postSubmission.findFirst({
    where: { id: getRouterParam(event, 'id') ?? '', userId },
    select: {
      id: true, type: true, status: true, credits: true, title: true, excerpt: true, content: true, coverUrl: true,
      targetUrl: true, anchorText: true, note: true, articleId: true, adminNote: true, submittedAt: true, reviewedAt: true, createdAt: true
    }
  })
  if (!sub) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  return sub
})
