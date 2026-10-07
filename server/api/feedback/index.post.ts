import type { FeedbackType } from '@prisma/client'

// Send feedback from Dashboard → Feedback (multipart: type, message, locale,
// optional file). Any logged-in, active user; rate limited per user.
export default defineEventHandler(async (event) => {
  // Also rejects banned / deleted accounts, which requireUser alone doesn't.
  const user = await requireRole(event, ['USER', 'MANAGER', 'ADMIN'])

  // Before reading the (possibly large) body.
  const now = Date.now()
  for (const { windowMs, max } of FEEDBACK_LIMITS) {
    const recent = await prisma.feedback.count({ where: { userId: user.id, createdAt: { gte: new Date(now - windowMs) } } })
    if (recent >= max) throw feedbackError('RATE_LIMIT', 'Too much feedback sent recently. Please try again later.', 429)
  }

  const form = await readFeedbackForm(event)

  if (!FEEDBACK_TYPES.includes(form.type as FeedbackType)) throw feedbackError('BAD_TYPE', 'Invalid feedback type.')
  const message = form.message.trim()
  if (message.length < FEEDBACK_MIN_LENGTH) throw feedbackError('TOO_SHORT', `Message must be at least ${FEEDBACK_MIN_LENGTH} characters.`)
  if (message.length > FEEDBACK_MAX_LENGTH) throw feedbackError('TOO_LONG', `Message must be ${FEEDBACK_MAX_LENGTH} characters or fewer.`)

  let attachment: { key: string; name: string | null; size: number; type: string } | null = null
  if (form.file) {
    if (form.file.data.length > FEEDBACK_MAX_BYTES) throw feedbackError('FILE_TOO_LARGE', 'Attachment must be 20 MB or smaller.', 413)
    const kind = detectFeedbackAttachment(form.file.data)
    if (!kind) throw feedbackError('FILE_TYPE', 'Only PNG, JPG, WebP, GIF, MP4, WebM or MOV files are allowed.')
    attachment = {
      key: await saveFeedbackAttachment(form.file.data, kind.ext),
      name: cleanFileName(form.file.filename),
      size: form.file.data.length,
      type: kind.type
    }
  }

  try {
    const feedback = await prisma.feedback.create({
      data: {
        userId: user.id,
        type: form.type as FeedbackType,
        message,
        attachmentUrl: attachment?.key ?? null,
        attachmentName: attachment?.name ?? null,
        attachmentSize: attachment?.size ?? null,
        attachmentType: attachment?.type ?? null,
        locale: normalizeLocale(form.locale),
        userAgent: getHeader(event, 'user-agent')?.slice(0, 400) ?? null
      },
      select: { id: true, type: true, status: true, createdAt: true }
    })
    return feedback
  } catch (error) {
    // Don't leave an orphaned file behind when the row couldn't be saved.
    await removeFeedbackAttachment(attachment?.key)
    throw error
  }
})
