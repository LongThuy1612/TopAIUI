// Dashboard → Website Insights: monthly traffic of published tools, from
// ToolAnalyticsData (trafficVisits is { "YYYY-MM-01": visits }).
//
// ?month=YYYY-MM (default: latest month with data) &q= &sort=visits|growth|growthRate
// &dir=desc|asc &page= &limit=

interface InsightRow {
  slug: string
  name: string
  website: string | null
  domain: string | null
  logo: string | null
  categories: string[]
  // month key ("YYYY-MM") -> visits
  visits: Record<string, number>
  avgVisitDuration: number | null // seconds
  bounceRate: number | null // 0..100
  pagesPerVisit: number | null
}

function domainOf(url: string | null) {
  if (!url) return null
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

function finiteOrNull(value: unknown) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

// Same for every user, so built once per locale and cached; the handler below
// only filters / sorts / pages it.
const loadInsightRows = defineCachedFunction(async (locale: string): Promise<InsightRow[]> => {
  const analytics = await prisma.toolAnalyticsData.findMany({
    select: { toolSlug: true, trafficVisits: true, engagement: true }
  })
  const bySlug = new Map(analytics.map(a => [a.toolSlug, a]))

  const tools = await prisma.tool.findMany({
    where: { slug: { in: [...bySlug.keys()] }, status: 'PUBLISHED', deletedAt: null },
    select: {
      slug: true,
      name: true,
      website: true,
      logoUrl: true,
      icon: true,
      categories: { select: { slug: true, name: true, translations: { select: { locale: true, name: true } } } }
    }
  })

  return tools.map((tool) => {
    const a = bySlug.get(tool.slug)!
    const visits: Record<string, number> = {}
    const traffic = (a.trafficVisits ?? {}) as Record<string, unknown>
    for (const [day, value] of Object.entries(traffic)) {
      const n = finiteOrNull(value)
      if (n !== null && /^\d{4}-\d{2}/.test(day)) visits[day.slice(0, 7)] = n
    }
    const engagement = (a.engagement ?? {}) as Record<string, unknown>
    const bounce = finiteOrNull(engagement.bounceRate)
    const website = safeHttpUrl(tool.website)
    return {
      slug: tool.slug,
      name: tool.name,
      website,
      domain: domainOf(website),
      logo: resolveToolImage(tool.logoUrl) ?? resolveToolImage(tool.icon),
      categories: tool.categories.map(c => cleanText(pickByLocale(c.translations, locale)?.name) ?? cleanText(c.name) ?? c.slug),
      visits,
      avgVisitDuration: finiteOrNull(engagement.timeOnSite),
      bounceRate: bounce === null ? null : bounce * 100,
      pagesPerVisit: finiteOrNull(engagement.pagePerVisit)
    }
  })
}, {
  name: 'insight-rows',
  maxAge: 600,
  swr: true,
  getKey: (locale: string) => locale,
  shouldBypassCache: () => import.meta.dev
})

function previousMonth(month: string) {
  const [y, m] = month.split('-').map(Number) as [number, number]
  const d = new Date(Date.UTC(y, m - 2, 1))
  return d.toISOString().slice(0, 7)
}

const SORTS = ['visits', 'growth', 'growthRate'] as const
type Sort = typeof SORTS[number]

export default defineEventHandler(async (event) => {
  requireUser(event)
  const query = getQuery(event)
  const locale = normalizeLocale(query.locale)
  const rows = await loadInsightRows(locale)

  const months = [...new Set(rows.flatMap(r => Object.keys(r.visits)))].sort().reverse()
  const requested = String(query.month ?? '')
  const month = months.includes(requested) ? requested : months[0] ?? null
  const sort: Sort = (SORTS as readonly string[]).includes(String(query.sort)) ? query.sort as Sort : 'visits'
  const dir = query.dir === 'asc' ? 1 : -1
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 50))
  const q = String(query.q ?? '').trim().toLowerCase()

  if (!month) return { months, month, total: 0, page: 1, pageCount: 0, items: [] }

  const prev = previousMonth(month)
  // Sparkline: up to the last 6 months ending at the selected one.
  const trendMonths = months.filter(m => m <= month).slice(0, 6).reverse()

  let items = rows
    .filter(r => r.visits[month] !== undefined)
    .map((r) => {
      const visits = r.visits[month]!
      const before = r.visits[prev]
      const growth = before === undefined ? null : visits - before
      const growthRate = before ? (visits - before) / before * 100 : null
      return {
        slug: r.slug,
        name: r.name,
        website: r.website,
        domain: r.domain,
        logo: r.logo,
        categories: r.categories,
        monthlyVisits: visits,
        growth,
        growthRate,
        trend: trendMonths.map(m => r.visits[m] ?? null),
        avgVisitDuration: r.avgVisitDuration,
        bounceRate: r.bounceRate,
        pagesPerVisit: r.pagesPerVisit
      }
    })

  if (q) items = items.filter(r => r.name.toLowerCase().includes(q) || r.domain?.includes(q))

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
  return {
    months,
    month,
    total,
    page,
    pageCount: Math.ceil(total / limit),
    items: items.slice((page - 1) * limit, page * limit)
  }
})
