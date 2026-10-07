// Streams a feedback attachment to its sender or to an admin. The client
// fetches it with the x-user-token header (an <img src> can't send one) and
// shows it from a blob URL.
export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ['USER', 'MANAGER', 'ADMIN'])
  const id = getRouterParam(event, 'id') ?? ''

  const feedback = await prisma.feedback.findUnique({
    where: { id },
    select: { userId: true, attachmentUrl: true, attachmentName: true }
  })
  // Same 404 whether it doesn't exist or isn't yours, so ids can't be probed.
  if (!feedback || !feedback.attachmentUrl || (feedback.userId !== user.id && user.role !== 'ADMIN')) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const data = await readFeedbackAttachment(feedback.attachmentUrl)
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  const ext = feedback.attachmentUrl.split('.').pop()!
  const fileName = feedback.attachmentName || `attachment.${ext}`
  setResponseHeaders(event, {
    'Content-Type': FEEDBACK_CONTENT_TYPES[ext] ?? 'application/octet-stream',
    'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'"
  })
  return data
})
