// Ranking data comes from ToolAnalyticsData (monthly traffic history, traffic
// sources, geography) — the ranking columns on Tool (monthlyVisits,
// last*MonthGrowth, region, source, monthlyRevenue) are almost all empty.
//
// The whole set (a few thousand published tools with traffic) is loaded once
// into memory and re-read hourly; /api/ranking filters, sorts and pages it.

// Growth is only ranked for tools that had at least this many visits in the
// base month — otherwise a tool going from 1K to 3K visits tops the chart.
export const MIN_GROWTH_BASE_VISITS = 10_000

export type RankingSort = 'traffic' | 'growth1m' | 'growth3m' | 'growth6m'

export interface RankedTool {
  slug: string
  name: string
  logoUrl: string | null
  categoryIds: string[]
  visits: number
  /** Percent change vs. 1/3/6 months earlier; null when there's no reliable base. */
  growth1m: number | null
  growth3m: number | null
  growth6m: number | null
  /** Traffic source name → share 0-100. */
  sources: Record<string, number>
  /** Top countries (alpha-2) → share 0-100. */
  countries: { code: string; pct: number }[]
}

export interface RankingCategory {
  id: string
  slug: string
  name: string | null
  translations: { locale: string; name: string | null }[]
}

export interface RankingDataset {
  /** Month the visits are for, YYYY-MM. */
  month: string | null
  tools: RankedTool[]
  categories: RankingCategory[]
}

type Row = {
  id: string
  slug: string
  name: string
  logoUrl: string | null
  trafficVisits: unknown
  trafficSources: unknown
  geography: unknown
}

// "2026-08" minus n months → "2026-02"
function shiftMonth(month: string, n: number) {
  const [y, m] = month.split('-').map(Number) as [number, number]
  const d = new Date(Date.UTC(y, m - 1 - n, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

// trafficVisits is { "YYYY-MM-01": visits } → { "YYYY-MM": visits }
function monthlyVisits(trafficVisits: unknown) {
  const byMonth: Record<string, number> = {}
  for (const [key, value] of Object.entries(asRecord(trafficVisits))) {
    const visits = asNumber(value)
    if (/^\d{4}-\d{2}/.test(key) && visits != null) byMonth[key.slice(0, 7)] = visits
  }
  return byMonth
}

// The newest month nearly every tool has data for. Tools without that month
// drop out of the ranking, so while the crawler is part-way through adding a
// new month (or a few rows carry a stray newer one) the previous, complete
// month is used instead.
function pickLatestMonth(histories: Record<string, number>[]) {
  const counts = new Map<string, number>()
  for (const h of histories) for (const month of Object.keys(h)) counts.set(month, (counts.get(month) ?? 0) + 1)
  const max = Math.max(0, ...counts.values())
  return [...counts.entries()]
    .filter(([, count]) => count >= max * 0.9)
    .map(([month]) => month)
    .sort()
    .at(-1) ?? null
}

// Rows come from two scrapers that name sources differently ("Referral" vs
// "Referrals", "Search" vs "SearchOrganic"); fold them into one set.
// Anything not listed ("Others", unknown keys) isn't rankable and is dropped.
const SOURCE_NAMES: Record<string, string> = {
  direct: 'Direct',
  search: 'Search',
  searchorganic: 'Search',
  organicsearch: 'Search',
  searchpaid: 'Paid Search',
  paidsearch: 'Paid Search',
  social: 'Social',
  socialorganic: 'Social',
  socialpaid: 'Paid Social',
  paidsocial: 'Paid Social',
  referral: 'Referral',
  referrals: 'Referral',
  mail: 'Mail',
  email: 'Mail',
  displayads: 'Display Ads',
  display: 'Display Ads',
  genai: 'AI Chatbots',
  affiliate: 'Affiliate'
}

// trafficSources is { "Direct": 81.7, "Search": 12, ... } — percentages, but
// some rows store 0-1 fractions.
function normalizeSources(trafficSources: unknown) {
  const entries = Object.entries(asRecord(trafficSources))
    .map(([name, v]) => [name, asNumber(v) ?? 0] as const)
    .filter(([, pct]) => pct > 0)
  const isFraction = entries.reduce((sum, [, pct]) => sum + pct, 0) <= 1.5
  const sources: Record<string, number> = {}
  for (const [key, pct] of entries) {
    const normalized = key.toLowerCase().replace(/[^a-z]/g, '')
    const name = Object.hasOwn(SOURCE_NAMES, normalized) ? SOURCE_NAMES[normalized] : undefined
    if (name) sources[name] = (sources[name] ?? 0) + (isFraction ? pct * 100 : pct)
  }
  return sources
}

function growth(history: Record<string, number>, month: string, monthsBack: number) {
  const now = history[month]
  const base = history[shiftMonth(month, monthsBack)]
  if (now == null || base == null || base < MIN_GROWTH_BASE_VISITS) return null
  return ((now - base) / base) * 100
}

async function loadRankingDataset(): Promise<RankingDataset> {
  const [rows, links, categories] = await Promise.all([
    prisma.$queryRaw<Row[]>`
      SELECT t.id, t.slug, t.name, t."logoUrl", a."trafficVisits", a."trafficSources", a.geography
      FROM "ToolAnalyticsData" a
      JOIN "Tool" t ON t.slug = a."toolSlug"
      WHERE t.status = 'PUBLISHED' AND t."deletedAt" IS NULL AND a."trafficVisits" IS NOT NULL
    `,
    // Implicit many-to-many table: A = Category.id, B = Tool.id
    prisma.$queryRaw<{ categoryId: string; toolId: string }[]>`
      SELECT "A" AS "categoryId", "B" AS "toolId" FROM "_ToolToCategory"
    `,
    prisma.category.findMany({
      select: { id: true, slug: true, name: true, translations: { select: { locale: true, name: true } } }
    })
  ])

  const categoryIdsByTool = new Map<string, string[]>()
  for (const { categoryId, toolId } of links) {
    const list = categoryIdsByTool.get(toolId)
    if (list) list.push(categoryId)
    else categoryIdsByTool.set(toolId, [categoryId])
  }

  const histories = rows.map(r => monthlyVisits(r.trafficVisits))
  const month = pickLatestMonth(histories)
  if (!month) return { month: null, tools: [], categories }

  // Several tools with the exact same large visit count are scraped pages
  // that recorded the traffic of the site they were listed on (e.g. a launch
  // platform), not their own — leave them out.
  const sameVisits = new Map<number, number>()
  for (const h of histories) {
    const v = h[month]
    if (v != null && v >= 100_000) sameVisits.set(v, (sameVisits.get(v) ?? 0) + 1)
  }

  const tools: RankedTool[] = []
  rows.forEach((row, i) => {
    const history = histories[i]!
    const visits = history[month]
    if (!visits || visits <= 0 || (sameVisits.get(visits) ?? 0) >= 3) return
    tools.push({
      slug: row.slug,
      name: row.name,
      logoUrl: resolveToolImage(row.logoUrl),
      categoryIds: categoryIdsByTool.get(row.id) ?? [],
      visits,
      growth1m: growth(history, month, 1),
      growth3m: growth(history, month, 3),
      growth6m: growth(history, month, 6),
      sources: normalizeSources(row.trafficSources),
      countries: normalizeGeography(row.geography, 10).map(c => ({ code: c.code, pct: c.pct }))
    })
  })
  tools.sort((a, b) => b.visits - a.visits)

  return { month, tools, categories }
}

// Kept as a plain in-process object rather than defineCachedFunction: Nitro's
// cache storage JSON-serializes entries, so every uncached /api/ranking call
// would re-parse the whole multi-MB dataset. Stale-while-revalidate: after an
// hour the current copy keeps being served while one rebuild runs; a failed
// rebuild keeps the old copy and is retried a minute later — not on the next
// request: while the database struggles, every ranking view would otherwise fire
// the ~40k-row query again (as memoryCached does, server/utils/memoryCached.ts).
// Dev keeps it only a minute: reloading ~40k rows / ~18 MB of JSON on every
// request made each ranking tab click take seconds, and a minute is still
// short enough for DB edits to show up while working on it.
const DATASET_MAX_AGE = (import.meta.dev ? 60 : 60 * 60) * 1000
let dataset: { value: RankingDataset; at: number } | null = null
let building: Promise<RankingDataset> | null = null

const RETRY_AFTER_FAILURE_MS = 60 * 1000

function rebuildRankingDataset() {
  building ??= loadRankingDataset()
    .then((value) => {
      dataset = { value, at: Date.now() }
      return value
    })
    .catch((err) => {
      if (dataset) dataset.at = Date.now() - DATASET_MAX_AGE + RETRY_AFTER_FAILURE_MS
      throw err
    })
    .finally(() => { building = null })
  return building
}

export async function getRankingDataset(): Promise<RankingDataset> {
  if (!dataset) return rebuildRankingDataset()
  // One background rebuild at a time, logged once if it fails.
  if (!building && Date.now() - dataset.at > DATASET_MAX_AGE) {
    rebuildRankingDataset().catch(err => console.error('[ranking] dataset rebuild failed', err))
  }
  return dataset.value
}

export function categoryName(category: RankingCategory, locale: string) {
  return cleanText(pickByLocale(category.translations, locale)?.name) ?? cleanText(category.name) ?? category.slug
}

// Some tools were imported with their URL as the name — show the bare domain.
export function displayToolName(name: string) {
  if (!/^https?:\/\//i.test(name)) return name
  try {
    return new URL(name).hostname.replace(/^www\./, '')
  } catch {
    return name
  }
}
