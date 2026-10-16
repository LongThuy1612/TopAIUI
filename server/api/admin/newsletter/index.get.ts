// Admin → Newsletter: the subscribers, newest first. ?q= email, ?page= (100 a page).
// ?format=csv downloads every subscriber (email, language, date).
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const query = getQuery(event)
  const q = String(query.q ?? '').trim()
  const where = q ? { email: { contains: q, mode: 'insensitive' as const } } : {}

  if (query.format === 'csv') {
    const rows = await prisma.newsletterSubscriber.findMany({ where, orderBy: { createdAt: 'desc' }, select: { email: true, locale: true, createdAt: true } })
    const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
    const csv = ['email,language,subscribed_at', ...rows.map(r => [r.email, r.locale, r.createdAt.toISOString()].map(cell).join(','))].join('\n')
    setResponseHeaders(event, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="newsletter-${new Date().toISOString().slice(0, 10)}.csv"`
    })
    return csv
  }

  const LIMIT = 100
  const page = Math.max(1, Math.floor(Number(query.page)) || 1)
  const [items, total, all, lastWeek] = await Promise.all([
    prisma.newsletterSubscriber.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * LIMIT, take: LIMIT, select: { id: true, email: true, locale: true, userId: true, createdAt: true } }),
    prisma.newsletterSubscriber.count({ where }),
    prisma.newsletterSubscriber.count(),
    prisma.newsletterSubscriber.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } })
  ])
  return { items, total, page, pageCount: Math.max(1, Math.ceil(total / LIMIT)), stats: { all, lastWeek } }
})
