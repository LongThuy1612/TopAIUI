import type { FeedbackStatus, FeedbackType, Prisma } from '@prisma/client'

// Admin → Feedback list. Filter by status / type, search the message and the
// sender, newest first.
export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN'])

  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 50))

  const where: Prisma.FeedbackWhereInput = {}
  if (FEEDBACK_STATUSES.includes(String(query.status) as FeedbackStatus)) where.status = query.status as FeedbackStatus
  if (FEEDBACK_TYPES.includes(String(query.type) as FeedbackType)) where.type = query.type as FeedbackType
  const q = String(query.q ?? '').trim()
  if (q) {
    where.OR = [
      { message: { contains: q, mode: 'insensitive' } },
      { user: { email: { contains: q, mode: 'insensitive' } } },
      { user: { name: { contains: q, mode: 'insensitive' } } }
    ]
  }

  const [items, total, newCount] = await Promise.all([
    prisma.feedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        type: true,
        message: true,
        status: true,
        adminNote: true,
        attachmentUrl: true,
        attachmentName: true,
        attachmentType: true,
        attachmentSize: true,
        locale: true,
        userAgent: true,
        resolvedAt: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } }
      }
    }),
    prisma.feedback.count({ where }),
    prisma.feedback.count({ where: { status: 'NEW' } })
  ])

  return {
    // The storage key stays on the server; the client only needs to know there is a file.
    items: items.map(({ attachmentUrl, ...f }) => ({ ...f, hasAttachment: !!attachmentUrl })),
    total,
    newCount,
    page,
    pageCount: Math.max(1, Math.ceil(total / limit))
  }
})
