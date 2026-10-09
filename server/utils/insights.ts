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
  categories: string[]
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

// Same for every user, so built once per locale and cached; the handler below
// only filters / sorts / pages it.
export const loadInsightRows = defineCachedFunction(async (locale: string): Promise<InsightRow[]> => {
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
      categorySlugs: tool.categories.map(c => c.slug),
      visits,
      avgVisitDuration: finiteOrNull(engagement.timeOnSite),
      bounceRate: bounce === null ? null : bounce * 100,
      pagesPerVisit: finiteOrNull(engagement.pagePerVisit)
    }
  })
}, {
  name: 'insight-rows-v2',
  maxAge: 600,
  swr: true,
  getKey: (locale: string) => locale,
  shouldBypassCache: () => import.meta.dev
})

export function previousMonth(month: string) {
  const [y, m] = month.split('-').map(Number) as [number, number]
  const d = new Date(Date.UTC(y, m - 2, 1))
  return d.toISOString().slice(0, 7)
}

// Key of a paid Website Insights row in ResearchUsageItem (one tool, one data month).
export const insightKey = (month: string, slug: string) => `insights:${month}:${slug}`

export type InsightItem = ReturnType<typeof insightItemsFor>[number]

// One month's figures for every tool that has them.
export function insightItemsFor(rows: InsightRow[], months: string[], month: string) {
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
        categories: r.categories,
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

export function insightMonths(rows: InsightRow[]) {
  return [...new Set(rows.flatMap(r => Object.keys(r.visits)))].sort().reverse()
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

export function applyInsightFilters(items: InsightItem[], f: InsightFilters) {
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
export function insightCategories(rows: InsightRow[]) {
  const map = new Map<string, string>()
  for (const r of rows) r.categorySlugs.forEach((slug, i) => map.set(slug, r.categories[i] ?? slug))
  return [...map].map(([slug, name]) => ({ slug, name })).sort((a, b) => a.name.localeCompare(b.name))
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
// distribution, growth by category.
export function insightStats(rows: InsightRow[], months: string[], month: string, items: InsightItem[], level: 'basic' | 'deep') {
  const totalVisits = items.reduce((s, r) => s + r.monthlyVisits, 0)
  const withPrev = items.filter(r => r.growth !== null && r.growthRate !== null)
  const prevOfThem = withPrev.reduce((s, r) => s + (r.monthlyVisits - r.growth!), 0)
  const nowOfThem = withPrev.reduce((s, r) => s + r.monthlyVisits, 0)
  const byCategory = new Map<string, { name: string; visits: number; now: number; prev: number }>()
  for (const r of items) {
    r.categorySlugs.forEach((slug, i) => {
      const c = byCategory.get(slug) ?? { name: r.categories[i] ?? slug, visits: 0, now: 0, prev: 0 }
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
