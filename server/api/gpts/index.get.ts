import type { Prisma } from '@prisma/client'
import { isGptCategory } from '#shared/gpts'

// Published GPTs for /gpts, newest first. ?category, ?q (name), ?page, ?limit (≤ 48).
// Cached briefly for the usual URLs; searches and odd URLs skip the cache.
export default defineCachedEventHandler(async (event) => {
  const query = getQuery(event)
  const page = Math.max(1, Math.floor(Number(query.page)) || 1)
  const limit = Math.min(48, Math.max(1, Math.floor(Number(query.limit)) || 24))
  const where: Prisma.GptWhereInput = { status: 'PUBLISHED' }
  if (isGptCategory(query.category)) where.category = query.category
  const q = typeof query.q === 'string' ? query.q.trim().slice(0, 80) : ''
  if (q) where.name = { contains: q, mode: 'insensitive' }
  const [items, total] = await Promise.all([
    prisma.gpt.findMany({ where, orderBy: [{ publishedAt: 'desc' }, { id: 'asc' }], skip: (page - 1) * limit, take: limit, select: gptCardSelect }),
    prisma.gpt.count({ where })
  ])
  return { items, total, page, pageCount: Math.ceil(total / limit) }
}, {
  name: 'api-gpts',
  maxAge: 60,
  swr: true,
  shouldBypassCache: (event) => {
    const { page = '1', limit = '24', q } = getQuery(event) as Record<string, string>
    return import.meta.dev || !!q || !['8', '24'].includes(String(limit)) || !/^[1-9]\d{0,2}$/.test(String(page))
  }
})
