import { SITE_TIME_ZONE, siteDayStart } from '#shared/time'

// Days of one month that have published tools, keyed by addedOn in Vietnam time
// (shared/time.ts) — drives the calendar on /archive/[date].
// ?month=YYYY-MM → [{ date: 'YYYY-MM-DD', count }]
// Cached per month like the other public lists; only the current month changes.
export default defineCachedEventHandler(async (event) => {
  const month = String(getQuery(event).month ?? '')
  const start = /^\d{4}-\d{2}$/.test(month) ? siteDayStart(`${month}-01`) : null
  if (!start) {
    throw createError({ statusCode: 400, statusMessage: 'month must be YYYY-MM' })
  }
  const [y, m] = month.split('-').map(Number) as [number, number]
  const end = siteDayStart(`${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, '0')}-01`)!

  // addedOn is a timestamp without zone holding UTC: → UTC → Vietnam time, then the day.
  return prisma.$queryRaw<{ date: string; count: number }[]>`
    SELECT to_char(("addedOn" AT TIME ZONE 'UTC') AT TIME ZONE ${SITE_TIME_ZONE}, 'YYYY-MM-DD') AS date, count(*)::int AS count
    FROM "Tool"
    WHERE status = 'PUBLISHED' AND "deletedAt" IS NULL AND "addedOn" >= ${start} AND "addedOn" < ${end}
    GROUP BY 1
    ORDER BY 1
  `
}, { name: 'api-archive-days', maxAge: 600, swr: true, shouldBypassCache: () => import.meta.dev })
