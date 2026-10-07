import type { FeedbackStatus } from '@prisma/client'

// Admin: change a feedback's status and / or its internal note.
// resolvedAt is set on the move into RESOLVED / CLOSED and cleared when it is
// reopened (NEW / IN_PROGRESS).
export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN'])
  const id = getRouterParam(event, 'id')!
  const body = await readBody<{ status?: unknown; adminNote?: unknown }>(event)
  const bad = (message: string) => createError({ statusCode: 400, statusMessage: message, message })

  const data: { status?: FeedbackStatus; adminNote?: string | null; resolvedAt?: Date | null } = {}
  if (body?.status !== undefined) {
    if (!FEEDBACK_STATUSES.includes(body.status as FeedbackStatus)) throw bad('Invalid status')
    data.status = body.status as FeedbackStatus
  }
  if (body?.adminNote !== undefined) {
    if (body.adminNote !== null && typeof body.adminNote !== 'string') throw bad('Invalid note')
    const note = body.adminNote?.trim() || null
    if (note && note.length > FEEDBACK_NOTE_MAX_LENGTH) throw bad(`Note must be ${FEEDBACK_NOTE_MAX_LENGTH} characters or fewer`)
    data.adminNote = note
  }
  if (!Object.keys(data).length) throw bad('Nothing to update')

  const current = await prisma.feedback.findUnique({ where: { id }, select: { status: true, resolvedAt: true } })
  if (!current) throw createError({ statusCode: 404, statusMessage: 'Feedback not found' })

  if (data.status && data.status !== current.status) {
    const done = data.status === 'RESOLVED' || data.status === 'CLOSED'
    const wasDone = current.status === 'RESOLVED' || current.status === 'CLOSED'
    // RESOLVED → CLOSED keeps the original resolution time.
    if (done && !wasDone) data.resolvedAt = new Date()
    if (!done) data.resolvedAt = null
  }

  // updateMany so a row deleted meanwhile by another admin gives 404, not a 500.
  const { count } = await prisma.feedback.updateMany({ where: { id }, data })
  if (!count) throw createError({ statusCode: 404, statusMessage: 'Feedback not found' })

  return prisma.feedback.findUnique({
    where: { id },
    select: { id: true, status: true, adminNote: true, resolvedAt: true }
  })
})
