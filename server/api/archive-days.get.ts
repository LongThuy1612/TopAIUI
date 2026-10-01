// Days of one month (UTC) that have published tools, keyed by addedOn — drives
// the calendar on /archive/[date]. ?month=YYYY-MM → [{ date: 'YYYY-MM-DD', count }]
export default defineEventHandler(async (event) => {
  const month = String(getQuery(event).month ?? '')
  const start = /^\d{4}-\d{2}$/.test(month) ? new Date(`${month}-01T00:00:00Z`) : null
  if (!start || Number.isNaN(start.getTime())) {
    throw createError({ statusCode: 400, statusMessage: 'month must be YYYY-MM' })
  }
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1))

  return prisma.$queryRaw<{ date: string; count: number }[]>`
    SELECT to_char("addedOn", 'YYYY-MM-DD') AS date, count(*)::int AS count
    FROM "Tool"
    WHERE status = 'PUBLISHED' AND "deletedAt" IS NULL AND "addedOn" >= ${start} AND "addedOn" < ${end}
    GROUP BY 1
    ORDER BY 1
  `
})
