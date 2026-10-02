// Ranked tool list for the /ranking pages. Optional filters narrow the set:
//   ?category=<slug>  tools in that category, by visits
//   ?country=<XX>     tools by visits coming from that country (alpha-2)
//   ?source=<name>    tools by visits coming from that traffic source
// otherwise ?sort=traffic|growth1m|growth3m|growth6m ranks every tool.
//
// No response cache: filtering and sorting the in-memory dataset takes about a
// millisecond, while caching per URL would keep one entry for every
// country/source/page combination anyone (or any bot) ever requests.
const SORTS: RankingSort[] = ['traffic', 'growth1m', 'growth3m', 'growth6m']

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const locale = String(query.locale ?? 'en')
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 50))
  const sort = SORTS.includes(query.sort as RankingSort) ? query.sort as RankingSort : 'traffic'
  const categorySlug = query.category ? String(query.category) : null
  const country = query.country ? String(query.country).toUpperCase() : null
  const source = query.source ? String(query.source) : null

  const { month, tools, categories } = await getRankingDataset()
  const categoryById = new Map(categories.map(c => [c.id, c]))

  // score = the number the list is ordered by; share = the % behind it (country/source)
  let ranked: { tool: RankedTool; score: number; share: number | null }[]
  if (country) {
    ranked = tools.flatMap((tool) => {
      const pct = tool.countries.find(c => c.code === country)?.pct
      return pct ? [{ tool, score: tool.visits * pct / 100, share: pct }] : []
    })
  } else if (source) {
    ranked = tools.flatMap((tool) => {
      // own-property check: ?source=constructor must not hit Object.prototype
      const pct = Object.hasOwn(tool.sources, source) ? tool.sources[source] : undefined
      return pct ? [{ tool, score: tool.visits * pct / 100, share: pct }] : []
    })
  } else if (categorySlug) {
    const category = categories.find(c => c.slug === categorySlug)
    ranked = category
      ? tools.filter(tool => tool.categoryIds.includes(category.id)).map(tool => ({ tool, score: tool.visits, share: null }))
      : []
  } else if (sort === 'traffic') {
    ranked = tools.map(tool => ({ tool, score: tool.visits, share: null }))
  } else {
    ranked = tools.flatMap(tool => (tool[sort] == null ? [] : [{ tool, score: tool[sort]!, share: null }]))
  }
  ranked.sort((a, b) => b.score - a.score)

  const growthField = sort === 'traffic' ? 'growth1m' : sort
  const start = (page - 1) * limit
  return {
    month,
    minGrowthBase: MIN_GROWTH_BASE_VISITS,
    total: ranked.length,
    page,
    pageCount: Math.max(1, Math.ceil(ranked.length / limit)),
    items: ranked.slice(start, start + limit).map(({ tool, score, share }, i) => ({
      rank: start + i + 1,
      slug: tool.slug,
      name: displayToolName(tool.name),
      logoUrl: tool.logoUrl,
      visits: Math.round(tool.visits),
      growth: tool[growthField],
      score: Math.round(score),
      share,
      categories: tool.categoryIds.flatMap((id) => {
        const category = categoryById.get(id)
        return category ? [{ slug: category.slug, name: categoryName(category, locale) }] : []
      })
    }))
  }
})
