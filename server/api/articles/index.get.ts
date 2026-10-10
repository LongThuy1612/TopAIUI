// Published articles for /ai-news and the home "AI News" widget, newest first.
// ?page, ?limit (≤ 50). Cached briefly: identical for every visitor.
export default defineCachedEventHandler(async (event) => {
  const query = getQuery(event)
  const page = Math.max(1, Math.floor(Number(query.page)) || 1)
  const limit = Math.min(50, Math.max(1, Math.floor(Number(query.limit)) || 12))
  const where = { status: 'PUBLISHED' }
  const [items, total] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: [{ publishedAt: 'desc' }, { id: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
      select: { ...articleCardSelect, content: true }
    }),
    prisma.article.count({ where })
  ])
  return {
    items: items.map(({ content, ...a }) => ({ ...a, excerpt: a.excerpt || autoExcerpt(content) })),
    total,
    page,
    pageCount: Math.ceil(total / limit)
  }
}, {
  name: 'api-articles',
  maxAge: 60,
  swr: true,
  shouldBypassCache: (event) => {
    const { page = '1', limit = '12' } = getQuery(event) as Record<string, string>
    return import.meta.dev || !['10', '12'].includes(String(limit)) || !/^[1-9]\d{0,2}$/.test(String(page))
  }
})
