// Dashboard → Social Listening: how much each tool is talked about on social
// platforms, from tool_social_stats (filled by the social crawler).
//
// ?q= &category=<slug> &sort=videoCount|creatorsCount|monthlyTraffic|avgViews|
// avgInteractions|totalViews|totalInteractions &dir=desc|asc &page= &limit=

const SORT_FIELDS = {
  videoCount: 'relatedVideoCount',
  creatorsCount: 'relatedInfluencerCount',
  monthlyTraffic: 'monthVisitedCount',
  avgViews: 'averageViews',
  avgInteractions: 'averageEngagement',
  totalViews: 'totalViews',
  totalInteractions: 'totalEngagement'
} as const
type SortKey = keyof typeof SORT_FIELDS

interface SocialRow {
  slug: string
  // Whether /tools/<slug> exists: stats can be crawled for a tool that was
  // never listed here.
  hasPage: boolean
  name: string
  website: string | null
  logo: string | null
  intro: string | null
  categories: { slug: string; name: string }[]
  videoCount: number
  creatorsCount: number
  monthlyTraffic: number
  avgViews: number
  avgInteractions: number
  totalViews: number
  totalInteractions: number
}

// Same for every user, so built once per locale and cached; the handler below
// only filters / sorts / pages it.
const loadSocialRows = defineCachedFunction(async (locale: string): Promise<SocialRow[]> => {
  const stats = await prisma.toolSocialStats.findMany({
    select: {
      toolSlug: true, toolName: true, website: true, websiteLogo: true, whatIsSummary: true,
      relatedVideoCount: true, relatedInfluencerCount: true, monthVisitedCount: true,
      averageViews: true, averageEngagement: true, totalViews: true, totalEngagement: true
    }
  })
  if (!stats.length) return []

  // Tool rows give the localized intro and categories. Stats for a tool that
  // exists but isn't public (pending, rejected, deleted) are left out.
  const tools = await prisma.tool.findMany({
    where: { slug: { in: stats.map(s => s.toolSlug) } },
    select: {
      slug: true, name: true, website: true, logoUrl: true, icon: true, status: true, deletedAt: true,
      translations: { select: { locale: true, shortDesc: true } },
      categories: { select: { slug: true, name: true, translations: { select: { locale: true, name: true } } } }
    }
  })
  const bySlug = new Map(tools.map(t => [t.slug, t]))

  return stats.flatMap((s) => {
    const tool = bySlug.get(s.toolSlug)
    if (tool && (tool.status !== 'PUBLISHED' || tool.deletedAt)) return []
    return [{
      slug: s.toolSlug,
      hasPage: !!tool,
      name: tool?.name ?? s.toolName ?? s.toolSlug,
      website: safeHttpUrl(tool?.website ?? s.website),
      logo: resolveToolImage(tool?.logoUrl) ?? resolveToolImage(tool?.icon) ?? resolveToolImage(s.websiteLogo),
      intro: cleanText(tool ? pickByLocale(tool.translations, locale)?.shortDesc : null) ?? cleanText(s.whatIsSummary),
      categories: (tool?.categories ?? []).map(c => ({
        slug: c.slug,
        name: cleanText(pickByLocale(c.translations, locale)?.name) ?? cleanText(c.name) ?? c.slug
      })),
      // BigInt columns: counts stay far below 2^53, so plain numbers are safe for JSON.
      videoCount: Number(s.relatedVideoCount),
      creatorsCount: Number(s.relatedInfluencerCount),
      monthlyTraffic: Number(s.monthVisitedCount),
      avgViews: s.averageViews,
      avgInteractions: s.averageEngagement,
      totalViews: Number(s.totalViews),
      totalInteractions: Number(s.totalEngagement)
    }]
  })
}, {
  name: 'social-listening-rows',
  maxAge: 600,
  swr: true,
  getKey: (locale: string) => locale,
  shouldBypassCache: () => import.meta.dev
})

export default defineEventHandler(async (event) => {
  requireUser(event)
  const query = getQuery(event)
  const locale = normalizeLocale(query.locale)
  const rows = await loadSocialRows(locale)

  // Category filter options: every category that has at least one row.
  const categoryMap = new Map<string, string>()
  for (const r of rows) for (const c of r.categories) categoryMap.set(c.slug, c.name)
  const categories = [...categoryMap].map(([slug, name]) => ({ slug, name })).sort((a, b) => a.name.localeCompare(b.name))

  const sort: SortKey = Object.hasOwn(SORT_FIELDS, String(query.sort)) ? query.sort as SortKey : 'videoCount'
  const dir = query.dir === 'asc' ? 1 : -1
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 50))
  const q = String(query.q ?? '').trim().toLowerCase()
  const category = String(query.category ?? '')

  let items = rows
  if (category) items = items.filter(r => r.categories.some(c => c.slug === category))
  if (q) items = items.filter(r => r.name.toLowerCase().includes(q))
  items = [...items].sort((a, b) => (a[sort] - b[sort]) * dir || a.name.localeCompare(b.name))

  const total = items.length
  return {
    categories,
    total,
    page,
    pageCount: Math.ceil(total / limit),
    items: items.slice((page - 1) * limit, page * limit)
  }
})
