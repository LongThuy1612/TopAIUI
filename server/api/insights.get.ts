// Dashboard → Website Insights: monthly traffic of published tools (server/utils/insights.ts).
//
// ?month=YYYY-MM (default: latest month with data) &q= &sort=visits|growth|growthRate
// &dir=desc|asc &page= &limit= — plus the advanced / full filters of the user's plan
// (category, minVisits, maxVisits, minGrowthRate, maxGrowthRate | maxBounceRate,
// minDuration, minPagesPerVisit). Filters above the plan → 403.

const SORTS = ['visits', 'growth', 'growthRate'] as const
type Sort = typeof SORTS[number]

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

  const rows = await loadInsightRows(locale)
  const months = insightMonths(rows)
  const requested = String(query.month ?? '')
  const month = months.includes(requested) ? requested : months[0] ?? null
  const sort: Sort = (SORTS as readonly string[]).includes(String(query.sort)) ? query.sort as Sort : 'visits'
  const dir = query.dir === 'asc' ? 1 : -1
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 50))
  const categories = insightCategories(rows)

  if (!month) return { months, month, total: 0, page: 1, pageCount: 0, items: [], categories, credits: null }

  const items = applyInsightFilters(insightItemsFor(rows, months, month), filters)

  const sortValue = (r: typeof items[number]) =>
    sort === 'visits' ? r.monthlyVisits : sort === 'growth' ? r.growth : r.growthRate
  // Tools without a previous month (no growth figure) always go last.
  items.sort((a, b) => {
    const va = sortValue(a), vb = sortValue(b)
    if (va === null && vb === null) return a.name.localeCompare(b.name)
    if (va === null) return 1
    if (vb === null) return -1
    return (va - vb) * dir || a.name.localeCompare(b.name)
  })

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
    items: pageItems.map((r, i) => (!credits || credits.allowed.has(keyOf(r.slug)) ? { ...r, locked: false } : lockedRow(i))),
    credits: credits && { used: credits.used, limit: credits.limit, charged: credits.charged }
  }
})
