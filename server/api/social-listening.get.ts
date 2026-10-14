// Dashboard → Social Listening: how much each tool is talked about on social
// platforms, from tool_social_stats (data: server/utils/socialListening.ts).
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

export default defineEventHandler(async (event) => {
  await requireActiveUser(event)
  const query = getQuery(event)
  const locale = normalizeLocale(query.locale)
  const [rows, names] = await Promise.all([loadSocialRows(), categoryNames(locale)])
  const nameOf = (slug: string) => names.get(slug) ?? slug

  // Category filter options: every category that has at least one row.
  const categorySlugs = new Set<string>()
  for (const r of rows) for (const slug of r.categorySlugs) categorySlugs.add(slug)
  const categories = [...categorySlugs].map(slug => ({ slug, name: nameOf(slug) })).sort((a, b) => a.name.localeCompare(b.name))

  const sort: SortKey = Object.hasOwn(SORT_FIELDS, String(query.sort)) ? query.sort as SortKey : 'videoCount'
  const dir = query.dir === 'asc' ? 1 : -1
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 50))
  const q = String(query.q ?? '').trim().toLowerCase()
  const category = String(query.category ?? '')

  let items = rows
  if (category) items = items.filter(r => r.categorySlugs.includes(category))
  if (q) items = items.filter(r => r.name.toLowerCase().includes(q))
  items = [...items].sort((a, b) => (a[sort] - b[sort]) * dir || a.name.localeCompare(b.name))

  const total = items.length
  const pageRows = items.slice((page - 1) * limit, page * limit)
  const intros = await socialIntros(pageRows, locale)
  return {
    categories,
    total,
    page,
    pageCount: Math.ceil(total / limit),
    items: pageRows.map(r => ({
      slug: r.slug,
      hasPage: !!r.toolId,
      name: r.name,
      website: r.website,
      logo: r.logo,
      intro: intros.get(r.slug) ?? null,
      categories: r.categorySlugs.map(slug => ({ slug, name: nameOf(slug) })),
      videoCount: r.videoCount,
      creatorsCount: r.creatorsCount,
      monthlyTraffic: r.monthlyTraffic,
      avgViews: r.avgViews,
      avgInteractions: r.avgInteractions,
      totalViews: r.totalViews,
      totalInteractions: r.totalInteractions
    }))
  }
})
