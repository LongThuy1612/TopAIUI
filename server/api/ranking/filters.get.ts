// Options for the chips on /ranking/categories, /regions and /source, each
// with how many ranked tools it has — only options that have tools are listed.
// Computed from the in-memory ranking dataset, so it needs no cache of its own.
export default defineEventHandler(async (event) => {
  const locale = String(getQuery(event).locale ?? 'en')
  const { month, tools, categories } = await getRankingDataset()

  const categoryCounts = new Map<string, number>()
  const countryCounts = new Map<string, number>()
  const sourceCounts = new Map<string, number>()
  const bump = (map: Map<string, number>, key: string) => map.set(key, (map.get(key) ?? 0) + 1)
  for (const tool of tools) {
    tool.categoryIds.forEach(id => bump(categoryCounts, id))
    tool.countries.forEach(c => bump(countryCounts, c.code))
    Object.keys(tool.sources).forEach(name => bump(sourceCounts, name))
  }

  const byCount = <T extends { count: number }>(a: T, b: T) => b.count - a.count
  return {
    month,
    categories: categories
      .filter(c => categoryCounts.has(c.id))
      .map(c => ({ slug: c.slug, name: categoryName(c, locale), count: categoryCounts.get(c.id)! }))
      .sort(byCount),
    countries: [...countryCounts].map(([code, count]) => ({ code, count })).sort(byCount).slice(0, 40),
    sources: [...sourceCounts].map(([name, count]) => ({ name, count })).sort(byCount)
  }
})
