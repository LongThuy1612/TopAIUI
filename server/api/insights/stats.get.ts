// GET /api/insights/stats?month=&<same filters as the list>
// Statistics of the (filtered) month: basic on Starter / Professional, deep on Enterprise,
// none on Free (403). Aggregates only — no Data Credits.
export default defineEventHandler(async (event) => {
  const userId = await requireActiveUser(event)
  const query = getQuery(event)
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
  const isAdmin = user?.role === 'ADMIN'
  const access = await currentAccess(userId)
  const level = isAdmin ? 'deep' : access.stats
  if (level === 'none') {
    throw createError({ statusCode: 403, statusMessage: 'Upgrade required', message: 'Statistics need a paid plan.', data: { reason: 'stats' } })
  }

  const filters = readInsightFilters(query)
  if (!isAdmin) assertFiltersAllowed(filters, access.filters)
  const rows = await loadInsightRows(normalizeLocale(query.locale))
  const months = insightMonths(rows)
  const month = months.includes(String(query.month ?? '')) ? String(query.month) : months[0]
  if (!month) return null
  const items = applyInsightFilters(insightItemsFor(rows, months, month), filters)
  return insightStats(rows, months, month, items, level)
})
