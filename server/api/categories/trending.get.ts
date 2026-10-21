// GET /api/categories/trending?locale= → the home sidebar's Trending categories: the
// categories that got the most new tools (addedOn, else createdAt) in the last 7 days —
// "AI Video Generators · +38 this week". A quiet week (new tools in fewer than
// MIN_CATEGORIES categories) falls back to 30 days, and a quiet month to the biggest
// categories (period 'all', count = all tools).
// The same for every visitor, so cached.
const SIZE = 15
// A period is used once this many categories got new tools in it — one new tool in a quiet
// week would otherwise leave a one-line list.
const MIN_CATEGORIES = 5

export default defineCachedEventHandler(async (event) => {
  const locale = normalizeLocale(getQuery(event).locale)
  const published = { status: 'PUBLISHED', deletedAt: null } as const
  const addedSince = (days: number) => {
    const now = new Date()
    const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    // A date in the future (bad import data) would count as new for ever.
    return { ...published, OR: [{ addedOn: { gte: since, lte: now } }, { addedOn: null, createdAt: { gte: since, lte: now } }] }
  }

  for (const [period, days] of [['week', 7], ['month', 30]] as const) {
    const rows = await prisma.category.findMany({
      where: { tools: { some: addedSince(days) } },
      select: {
        slug: true, name: true,
        translations: { select: { locale: true, name: true } },
        _count: { select: { tools: { where: addedSince(days) } } }
      }
    })
    if (rows.length >= MIN_CATEGORIES) {
      return {
        period,
        items: rows
          .map(c => ({ slug: c.slug, name: categoryName(c, locale), count: c._count.tools }))
          .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
          .slice(0, SIZE)
      }
    }
  }
  const rows = await prisma.category.findMany({
    where: { tools: { some: published } },
    orderBy: { tools: { _count: 'desc' } },
    take: SIZE,
    select: {
      slug: true, name: true,
      translations: { select: { locale: true, name: true } },
      _count: { select: { tools: { where: published } } }
    }
  })
  return { period: 'all' as const, items: rows.map(c => ({ slug: c.slug, name: categoryName(c, locale), count: c._count.tools })) }
}, {
  name: 'api-categories-trending',
  maxAge: 600,
  swr: true,
  getKey: event => normalizeLocale(getQuery(event).locale),
  shouldBypassCache: () => import.meta.dev
})

// The category's name in this language — without a leading emoji some imported names carry.
function categoryName(c: { slug: string; name: string | null; translations: { locale: string; name: string }[] }, locale: string) {
  const name = localizedName(c.translations, locale, c.name, c.slug)
  return name.replace(/^[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}️‍\s]+/u, '').trim() || name
}
