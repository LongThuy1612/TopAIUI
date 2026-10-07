// Admin: delete a feedback and its attachment file.
export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN'])
  const id = getRouterParam(event, 'id')!

  // delete() returns the row, so the file key comes from the same statement
  // that removed it — no window for another admin to race us.
  const deleted = await prisma.feedback.delete({ where: { id }, select: { attachmentUrl: true } }).catch(() => null)
  if (!deleted) throw createError({ statusCode: 404, statusMessage: 'Feedback not found' })

  await removeFeedbackAttachment(deleted.attachmentUrl)
  return { ok: true }
})
