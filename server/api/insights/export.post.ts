// POST /api/insights/export { month, slugs: string[], locale? } → CSV file.
// Only rows the user has paid Data Credits for this quota month are exported (no extra
// credits). Each export spends the plan's export quota: at most N rows at a time and
// M rows per month (server/utils/research.ts chargeExport). Admins aren't limited.
const MAX_SLUGS = 5000

function csvCell(value: unknown) {
  let s = value === null || value === undefined ? '' : String(value)
  // Tool names are user-submitted: text starting with = + - @ would run as a formula
  // when the file is opened in Excel / Sheets, so neutralise it.
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export default defineEventHandler(async (event) => {
  const userId = await requireActiveUser(event)
  const body = await readBody<{ month?: unknown; slugs?: unknown; locale?: unknown }>(event)
  const month = typeof body?.month === 'string' ? body.month : ''
  const slugs = Array.isArray(body?.slugs) ? [...new Set(body.slugs.filter((s): s is string => typeof s === 'string'))] : []
  if (!month || !slugs.length || slugs.length > MAX_SLUGS) {
    throw createError({ statusCode: 400, statusMessage: 'Nothing to export', message: 'Pick the rows to export.' })
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
  const isAdmin = user?.role === 'ADMIN'
  // Only rows unlocked with Data Credits in this quota month.
  const allowed = isAdmin ? new Set(slugs.map(s => insightKey(month, s))) : await paidKeys(userId, slugs.map(s => insightKey(month, s)))
  const exportSlugs = slugs.filter(s => allowed.has(insightKey(month, s)))
  if (!exportSlugs.length) {
    throw createError({ statusCode: 403, statusMessage: 'Locked rows', message: 'These rows are locked — load them with Data Credits first.' })
  }

  const [rows, names] = await Promise.all([loadInsightRows(), categoryNames(normalizeLocale(body?.locale))])
  const index = insightIndex(rows)
  if (!index.months.includes(month)) throw createError({ statusCode: 400, statusMessage: 'Unknown month' })
  const wanted = new Set(exportSlugs)
  const items = index.items(month).filter(r => wanted.has(r.slug))
    .sort((a, b) => b.monthlyVisits - a.monthlyVisits)
    .map(r => withCategoryNames(r, names))

  if (!isAdmin) await chargeExport(userId, items.length)

  const header = ['Tool', 'Domain', 'Month', 'Monthly Visits', 'Growth', 'Growth Rate (%)', 'Categories', 'Avg Visit Duration (s)', 'Bounce Rate (%)']
  const lines = items.map(r => [
    r.name, r.domain, month, Math.round(r.monthlyVisits),
    r.growth === null ? '' : Math.round(r.growth),
    r.growthRate === null ? '' : Math.round(r.growthRate * 100) / 100,
    r.categories.join('; '),
    r.avgVisitDuration === null ? '' : Math.round(r.avgVisitDuration),
    r.bounceRate === null ? '' : Math.round(r.bounceRate * 100) / 100
  ].map(csvCell).join(','))

  setResponseHeaders(event, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="website-insights-${month}.csv"`,
    'Cache-Control': 'no-store',
    'X-Export-Rows': String(items.length)
  })
  // BOM so Excel reads UTF-8 names correctly.
  return String.fromCharCode(0xFEFF) + [header.join(','), ...lines].join('\n')
})
