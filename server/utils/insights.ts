import { FILTER_RANK, type FilterLevel } from '#shared/research'

// Dashboard → Website Insights data, shared by the list (server/api/insights.get.ts), the
// export and the statistics: monthly traffic of published tools, from ToolAnalyticsData
// (trafficVisits is { "YYYY-MM-01": visits }).

export interface InsightRow {
  slug: string
  name: string
  website: string | null
  domain: string | null
  logo: string | null
  // Names in the page's language are added per request (categoryNames).
  categorySlugs: string[]
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

// Same for every user and every language, so built once and kept in memory (memoryCached;
// one copy — per language it took ~18 MB each at 33k tools); the handlers only filter /
// sort / page it, through insightIndex.
//
// Published tools with analytics, joined in SQL: listing the analytics slugs in a
// `slug IN (…)` filter — and loading categories through the relation — binds one
// parameter per tool, which fails past PostgreSQL's 32,767.
export const loadInsightRows = memoryCached('insights', async (): Promise<InsightRow[]> => {
  const [tools, { slugsByTool }] = await Promise.all([
    prisma.$queryRaw<{
      id: string; slug: string; name: string; website: string | null; logoUrl: string | null; icon: string | null
      trafficVisits: unknown; engagement: unknown
    }[]>`
      SELECT t.id, t.slug, t.name, t.website, t."logoUrl", t.icon, a."trafficVisits", a.engagement
      FROM "ToolAnalyticsData" a JOIN "Tool" t ON t.slug = a."toolSlug"
      WHERE t.status = 'PUBLISHED' AND t."deletedAt" IS NULL`,
    loadToolCategories()
  ])

  return tools.map((tool) => {
    const visits: Record<string, number> = {}
    const traffic = (tool.trafficVisits ?? {}) as Record<string, unknown>
    for (const [day, value] of Object.entries(traffic)) {
      const n = finiteOrNull(value)
      if (n !== null && /^\d{4}-\d{2}/.test(day)) visits[day.slice(0, 7)] = n
    }
    const engagement = (tool.engagement ?? {}) as Record<string, unknown>
    const bounce = finiteOrNull(engagement.bounceRate)
    const website = safeHttpUrl(tool.website)
    return {
      slug: tool.slug,
      name: tool.name,
      website,
      domain: domainOf(website),
      logo: resolveToolImage(tool.logoUrl) ?? resolveToolImage(tool.icon),
      categorySlugs: slugsByTool[tool.id] ?? [],
      visits,
      avgVisitDuration: finiteOrNull(engagement.timeOnSite),
      bounceRate: bounce === null ? null : bounce * 100,
      pagesPerVisit: finiteOrNull(engagement.pagePerVisit)
    }
  })
}, 10 * 60 * 1000)

export function previousMonth(month: string) {
  const [y, m] = month.split('-').map(Number) as [number, number]
  const d = new Date(Date.UTC(y, m - 2, 1))
  return d.toISOString().slice(0, 7)
}

// Key of a paid Website Insights row in ResearchUsageItem (one tool, one data month).
export const insightKey = (month: string, slug: string) => `insights:${month}:${slug}`

export type InsightItem = ReturnType<typeof insightItemsFor>[number]

// One month's figures for every tool that has them (category names: withCategoryNames).
function insightItemsFor(rows: InsightRow[], months: string[], month: string) {
  const prev = previousMonth(month)
  // Sparkline: up to the last 6 months ending at the selected one.
  const trendMonths = months.filter(m => m <= month).slice(0, 6).reverse()
  return rows
    .filter(r => r.visits[month] !== undefined)
    .map((r) => {
      const visits = r.visits[month]!
      const before = r.visits[prev]
      return {
        slug: r.slug,
        name: r.name,
        website: r.website,
        domain: r.domain,
        logo: r.logo,
        categorySlugs: r.categorySlugs,
        monthlyVisits: visits,
        growth: before === undefined ? null : visits - before,
        growthRate: before ? (visits - before) / before * 100 : null,
        trend: trendMonths.map(m => r.visits[m] ?? null),
        avgVisitDuration: r.avgVisitDuration,
        bounceRate: r.bounceRate,
        pagesPerVisit: r.pagesPerVisit
      }
    })
}

// An item as the API sends it: with its category names in the page's language
// (`names`: categoryNames()), fields in their usual order. Only for the rows sent.
export function withCategoryNames(r: InsightItem, names: Map<string, string>) {
  return {
    slug: r.slug,
    name: r.name,
    website: r.website,
    domain: r.domain,
    logo: r.logo,
    categories: r.categorySlugs.map(slug => names.get(slug) ?? slug),
    categorySlugs: r.categorySlugs,
    monthlyVisits: r.monthlyVisits,
    growth: r.growth,
    growthRate: r.growthRate,
    trend: r.trend,
    avgVisitDuration: r.avgVisitDuration,
    bounceRate: r.bounceRate,
    pagesPerVisit: r.pagesPerVisit
  }
}

export type InsightSort = 'visits' | 'growth' | 'growthRate'

// Sorts in place. Tools without a previous month (no growth figure) always go last.
export function sortInsightItems(items: InsightItem[], sort: InsightSort, dir: 1 | -1) {
  const value = (r: InsightItem) => (sort === 'visits' ? r.monthlyVisits : sort === 'growth' ? r.growth : r.growthRate)
  return items.sort((a, b) => {
    const va = value(a), vb = value(b)
    if (va === null && vb === null) return a.name.localeCompare(b.name)
    if (va === null) return 1
    if (vb === null) return -1
    return (va - vb) * dir || a.name.localeCompare(b.name)
  })
}

// What every request needs from the cached rows, worked out once per copy of them (the
// rows only change when loadInsightRows rebuilds them, every 10 minutes): the months,
// the categories in use and — per month, when first asked for — the month's items
// already in the default order (most visits first). A page view without filters or
// another sort then only slices that list instead of building, filtering and sorting
// ~30k items. Only the last MONTHS_KEPT months asked for stay built.
const MONTHS_KEPT = 3
const indexes = new WeakMap<InsightRow[], ReturnType<typeof buildIndex>>()

function buildIndex(rows: InsightRow[]) {
  const months = [...new Set(rows.flatMap(r => Object.keys(r.visits)))].sort().reverse()
  const categorySlugs = [...new Set(rows.flatMap(r => r.categorySlugs))]
  const byMonth = new Map<string, InsightItem[]>()
  return {
    months,
    categorySlugs,
    // Shared: callers must not change the list or its items (sort a copy).
    items(month: string) {
      let items = byMonth.get(month)
      if (items) {
        byMonth.delete(month) // re-inserted below: the Map's order is the recency order
      } else {
        items = sortInsightItems(insightItemsFor(rows, months, month), 'visits', -1)
      }
      byMonth.set(month, items)
      if (byMonth.size > MONTHS_KEPT) byMonth.delete(byMonth.keys().next().value!)
      return items
    }
  }
}

export function insightIndex(rows: InsightRow[]) {
  let index = indexes.get(rows)
  if (!index) {
    index = buildIndex(rows)
    indexes.set(rows, index)
  }
  return index
}

/* ------------------------------------------------------------------ */
/* Filters by plan                                                     */
/* ------------------------------------------------------------------ */

const num = (v: unknown) => {
  if (v === undefined || v === null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// Every filter the page can send, with the plan level it needs.
// basic: search · advanced: category, visits range, growth-rate range ·
// full: max bounce rate, min visit duration (s), min pages per visit.
export function readInsightFilters(query: Record<string, unknown>) {
  return {
    q: String(query.q ?? '').trim().toLowerCase(),
    category: typeof query.category === 'string' && query.category ? query.category : null,
    minVisits: num(query.minVisits),
    maxVisits: num(query.maxVisits),
    minGrowthRate: num(query.minGrowthRate),
    maxGrowthRate: num(query.maxGrowthRate),
    maxBounceRate: num(query.maxBounceRate),
    minDuration: num(query.minDuration),
    minPagesPerVisit: num(query.minPagesPerVisit)
  }
}
export type InsightFilters = ReturnType<typeof readInsightFilters>

function filterLevelNeeded(f: InsightFilters): FilterLevel {
  if (f.maxBounceRate !== null || f.minDuration !== null || f.minPagesPerVisit !== null) return 'full'
  if (f.category || f.minVisits !== null || f.maxVisits !== null || f.minGrowthRate !== null || f.maxGrowthRate !== null) return 'advanced'
  return 'basic'
}

// Refuses (403) filters above the plan, so they can't be used by calling the API directly.
export function assertFiltersAllowed(f: InsightFilters, allowed: FilterLevel) {
  const needed = filterLevelNeeded(f)
  if (FILTER_RANK[needed] > FILTER_RANK[allowed]) {
    throw createError({ statusCode: 403, statusMessage: 'Upgrade required', message: 'These filters need a higher plan.', data: { reason: 'filters', needed } })
  }
}

// Returns `items` itself when no filter is set (no copy of ~30k items).
export function applyInsightFilters(items: InsightItem[], f: InsightFilters) {
  const any = f.q || f.category || [f.minVisits, f.maxVisits, f.minGrowthRate, f.maxGrowthRate, f.maxBounceRate, f.minDuration, f.minPagesPerVisit].some(v => v !== null)
  if (!any) return items
  return items.filter(r =>
    (!f.q || r.name.toLowerCase().includes(f.q) || !!r.domain?.includes(f.q)) &&
    (!f.category || r.categorySlugs.includes(f.category)) &&
    (f.minVisits === null || r.monthlyVisits >= f.minVisits) &&
    (f.maxVisits === null || r.monthlyVisits <= f.maxVisits) &&
    (f.minGrowthRate === null || (r.growthRate !== null && r.growthRate >= f.minGrowthRate)) &&
    (f.maxGrowthRate === null || (r.growthRate !== null && r.growthRate <= f.maxGrowthRate)) &&
    (f.maxBounceRate === null || (r.bounceRate !== null && r.bounceRate <= f.maxBounceRate)) &&
    (f.minDuration === null || (r.avgVisitDuration !== null && r.avgVisitDuration >= f.minDuration)) &&
    (f.minPagesPerVisit === null || (r.pagesPerVisit !== null && r.pagesPerVisit >= f.minPagesPerVisit))
  )
}

// Category options for the filter: every category with at least one tool.
export function insightCategories(rows: InsightRow[], names: Map<string, string>) {
  return insightIndex(rows).categorySlugs
    .map(slug => ({ slug, name: names.get(slug) ?? slug }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/* ------------------------------------------------------------------ */
/* Statistics by plan                                                  */
/* ------------------------------------------------------------------ */

const median = (xs: number[]) => {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2
}

// Aggregates over the (filtered) tools of one month — no row figures, so no Data Credits.
// basic: overview, top growth, visits by category · deep: + 12-month trend, growth
// distribution, growth by category. Category names in the page's language (`names`).
export function insightStats(rows: InsightRow[], months: string[], month: string, items: InsightItem[], level: 'basic' | 'deep', names: Map<string, string>) {
  const totalVisits = items.reduce((s, r) => s + r.monthlyVisits, 0)
  const withPrev = items.filter(r => r.growth !== null && r.growthRate !== null)
  const prevOfThem = withPrev.reduce((s, r) => s + (r.monthlyVisits - r.growth!), 0)
  const nowOfThem = withPrev.reduce((s, r) => s + r.monthlyVisits, 0)
  const byCategory = new Map<string, { name: string; visits: number; now: number; prev: number }>()
  for (const r of items) {
    r.categorySlugs.forEach((slug) => {
      const c = byCategory.get(slug) ?? { name: names.get(slug) ?? slug, visits: 0, now: 0, prev: 0 }
      c.visits += r.monthlyVisits
      if (r.growth !== null) { c.now += r.monthlyVisits; c.prev += r.monthlyVisits - r.growth }
      byCategory.set(slug, c)
    })
  }
  const basic = {
    month,
    toolCount: items.length,
    totalVisits,
    // Growth of the tools that have both months, so newcomers don't inflate it.
    totalGrowthRate: prevOfThem ? (nowOfThem - prevOfThem) / prevOfThem * 100 : null,
    medianGrowthRate: median(withPrev.map(r => r.growthRate!)),
    topGrowth: [...withPrev].sort((a, b) => b.growthRate! - a.growthRate!).slice(0, 5)
      .map(r => ({ slug: r.slug, name: r.name, growthRate: r.growthRate!, monthlyVisits: r.monthlyVisits })),
    categories: [...byCategory.values()].sort((a, b) => b.visits - a.visits).slice(0, 8)
      .map(c => ({ name: c.name, visits: c.visits, share: totalVisits ? c.visits / totalVisits * 100 : 0 }))
  }
  if (level !== 'deep') return { level, ...basic }

  const inSet = new Set(items.map(r => r.slug))
  const setRows = rows.filter(r => inSet.has(r.slug))
  const trendMonths = months.filter(m => m <= month).slice(0, 12).reverse()
  const buckets: [string, (g: number) => boolean][] = [
    ['< -20%', g => g < -20],
    ['-20% – 0%', g => g >= -20 && g < 0],
    ['0% – 20%', g => g >= 0 && g < 20],
    ['20% – 50%', g => g >= 20 && g < 50],
    ['≥ 50%', g => g >= 50]
  ]
  return {
    level,
    ...basic,
    trend: trendMonths.map(m => ({ month: m, visits: setRows.reduce((s, r) => s + (r.visits[m] ?? 0), 0) })),
    growthDistribution: buckets.map(([label, test]) => ({ label, count: withPrev.filter(r => test(r.growthRate!)).length })),
    categoryGrowth: [...byCategory.values()].filter(c => c.prev > 0)
      .sort((a, b) => b.visits - a.visits).slice(0, 8)
      .map(c => ({ name: c.name, visits: c.visits, growthRate: (c.now - c.prev) / c.prev * 100 }))
  }
}
