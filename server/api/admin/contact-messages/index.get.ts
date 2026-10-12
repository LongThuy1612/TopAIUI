import type { ContactStatus, Prisma } from '@prisma/client'

// Admin → Contact messages. Filter by status, search sender and text, newest first.
export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN'])

  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 50))

  const where: Prisma.ContactMessageWhereInput = {}
  if (CONTACT_STATUSES.includes(String(query.status) as ContactStatus)) where.status = query.status as ContactStatus
  const q = String(query.q ?? '').trim()
  if (q) {
    where.OR = [
      { message: { contains: q, mode: 'insensitive' } },
      { name: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } }
    ]
  }

  const [items, total, newCount] = await Promise.all([
    prisma.contactMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        subject: true,
        message: true,
        status: true,
        reply: true,
        repliedAt: true,
        locale: true,
        createdAt: true,
        userId: true
      }
    }),
    prisma.contactMessage.count({ where }),
    prisma.contactMessage.count({ where: { status: 'NEW' } })
  ])

  return { items, total, newCount, page, pageCount: Math.max(1, Math.ceil(total / limit)) }
})
