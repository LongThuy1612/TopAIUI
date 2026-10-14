// Dashboard → Website Insights: monthly traffic of published tools (server/utils/insights.ts).
//
// ?month=YYYY-MM (default: latest month with data) &q= &sort=visits|growth|growthRate
// &dir=desc|asc &page= &limit= — plus the advanced / full filters of the user's plan
// (category, minVisits, maxVisits, minGrowthRate, maxGrowthRate | maxBounceRate,
// minDuration, minPagesPerVisit). Filters above the plan → 403.

const SORTS = ['visits', 'growth', 'growthRate'] as const

// Shown in place of a row the user has no Data Credits left for: no figures at all, so
// the data can't be read from the response either.
const lockedRow = (i: number) => ({
  slug: `locked-${i}`, locked: true as const, name: '', website: null, domain: null, logo: null,
  categories: [] as string[], categorySlugs: [] as string[],
  monthlyVisits: 0, growth: null, growthRate: null, trend: [] as (number | null)[], avgVisitDuration: null, bounceRate: null, pagesPerVisit: null
})

export default defineEventHandler(async (event) => {
  const userId = await requireActiveUser(event)
  const query = getQuery(event)
  const locale = normalizeLocale(query.locale)
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
  const isAdmin = user?.role === 'ADMIN'
  const access = await currentAccess(userId)

  const filters = readInsightFilters(query)
  if (!isAdmin) assertFiltersAllowed(filters, access.filters)

  const [rows, names] = await Promise.all([loadInsightRows(), categoryNames(locale)])
  const index = insightIndex(rows)
  const months = index.months
  const requested = String(query.month ?? '')
  const month = months.includes(requested) ? requested : months[0] ?? null
  const sort: InsightSort = (SORTS as readonly string[]).includes(String(query.sort)) ? query.sort as InsightSort : 'visits'
  const dir = query.dir === 'asc' ? 1 : -1
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 50))
  const categories = insightCategories(rows, names)

  if (!month) return { months, month, total: 0, page: 1, pageCount: 0, items: [], categories, credits: null }

  // The month's list comes already in the default order (most visits first) and is shared
  // between requests: another order sorts a copy.
  const filtered = applyInsightFilters(index.items(month), filters)
  const items = sort === 'visits' && dir === -1 ? filtered : sortInsightItems([...filtered], sort, dir)

  const total = items.length
  const pageItems = items.slice((page - 1) * limit, page * limit)

  // Data Credits (server/utils/research.ts): 1 per row shown, a row already paid this
  // month is free. Admins aren't charged.
  const keyOf = (slug: string) => insightKey(month, slug)
  const credits = isAdmin ? null : await chargeDataRows(userId, pageItems.map(r => keyOf(r.slug)))

  return {
    months,
    month,
    total,
    page,
    pageCount: Math.ceil(total / limit),
    categories,
    items: pageItems.map((r, i) => (!credits || credits.allowed.has(keyOf(r.slug)) ? { ...withCategoryNames(r, names), locked: false } : lockedRow(i))),
    credits: credits && { used: credits.used, limit: credits.limit, charged: credits.charged }
  }
})
