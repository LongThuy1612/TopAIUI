// Admin → Newsletter → "Send this week's issue now": creates the issue (this week's
// content, to every current subscriber) and starts the first batch. The rest goes out
// hourly within the daily limit, like a scheduled one.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  if (!useRuntimeConfig().smtpHost && !import.meta.dev) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'SMTP is not configured.' })
  }
  const { issue, reason } = await createIssue('admin')
  if (!issue) {
    const message = reason === 'running' ? 'An issue is still being sent.' : reason === 'empty' ? 'Nothing new this week to send.' : 'There are no subscribers yet.'
    throw createError({ statusCode: 409, statusMessage: 'Conflict', message, data: { reason } })
  }
  // Not awaited: a batch takes minutes (one mail every few seconds).
  runNewsletter({ allowCreate: false }).catch(err => console.error('[newsletter]', err))
  return { ok: true, id: issue.id }
})
