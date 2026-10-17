// The site's own clock: launch days, the archive calendar and the dates shown on public
// pages follow Vietnam time (UTC+7, no daylight saving) — not the server's or UTC.
// Pages are cached and rendered on a server in UTC, so formatting must name the zone.
export const SITE_TIME_ZONE = 'Asia/Ho_Chi_Minh'
const OFFSET = '+07:00'
const OFFSET_MS = 7 * 60 * 60 * 1000

/** The site calendar day ("YYYY-MM-DD") a moment falls on. */
export function siteDay(date: Date | string | number = new Date()): string {
  return new Date(new Date(date).getTime() + OFFSET_MS).toISOString().slice(0, 10)
}

/** The moment a site calendar day ("YYYY-MM-DD") starts. Invalid → null. */
export function siteDayStart(day: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null
  const start = new Date(`${day}T00:00:00${OFFSET}`)
  return Number.isNaN(start.getTime()) ? null : start
}
