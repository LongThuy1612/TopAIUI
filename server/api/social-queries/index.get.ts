// The user's Social Listening queries, with how many crawled posts match and how many are
// new since they last opened each one, plus the active-query limit of their plan.
export default defineEventHandler(async (event) => {
  const userId = await requireActiveUser(event)
  const [queries, access, covered] = await Promise.all([
    prisma.socialQuery.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    currentAccess(userId),
    coveredQueryIds(userId)
  ])
  // Counts only for active queries — a paused one shows no results, and an Enterprise
  // user can have many paused ones.
  const items = await Promise.all(queries.map(async (q) => {
    const overLimit = q.active && !covered.has(q.id)
    if (!q.active || overLimit) return { id: q.id, name: q.name, keywords: q.keywords, active: q.active, overLimit, createdAt: q.createdAt, results: 0, fresh: 0 }
    const where = queryWhere(q.keywords)
    const [results, fresh] = await Promise.all([
      prisma.toolSocialFeed.count({ where }),
      prisma.toolSocialFeed.count({ where: { AND: [where, { createdAt: { gt: q.lastViewedAt ?? q.createdAt } }] } })
    ])
    return { id: q.id, name: q.name, keywords: q.keywords, active: q.active, overLimit: false, createdAt: q.createdAt, results, fresh }
  }))
  return { items, active: queries.filter(q => q.active).length, limit: access.quota.socialQueries }
})
