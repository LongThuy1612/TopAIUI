import type { H3Event } from 'h3'

// Home "Hot this week" (the left column): the tools people looked at and went to most in
// the last HOT_DAYS days, however old they are — unlike Today / New, which are by date.
//   score = VISIT_WEIGHT × "Visit website" clicks + page views + SAVE_WEIGHT × saves
// Views and clicks come from the browser (POST /api/tools/<slug>/track): one of each per
// visitor, tool and day, so reloads and crawlers don't count. Until enough tools reach
// MIN_SCORE the list is topped up with the tools with the most monthly traffic.

const HOT_DAYS = 7
const VISIT_WEIGHT = 3
const SAVE_WEIGHT = 5
// A tool needs at least this score to rank (about 5 views, 2 clicks or a save): a single
// view would otherwise put any page someone opened above the big tools while data is thin.
const MIN_SCORE = 5
export type ToolEvent = 'view' | 'visit'

const seen = new Set<string>()
let seenDay = ''
// Each new event costs a database write: at most this many per visitor per hour.
const EVENTS_PER_HOUR = 300
const recent = new Map<string, number[]>()
function overLimit(visitor: string) {
  const now = Date.now()
  const list = (recent.get(visitor) ?? []).filter(t => now - t < 60 * 60 * 1000)
  if (recent.size > 50_000) recent.clear()
  if (list.length >= EVENTS_PER_HOUR) { recent.set(visitor, list); return true }
  list.push(now)
  recent.set(visitor, list)
  return false
}

export async function trackToolEvent(event: H3Event, slug: string, kind: ToolEvent) {
  if (!isHumanRequest(event)) return false
  const day = new Date().toISOString().slice(0, 10)
  if (day !== seenDay || seen.size > 500_000) { seen.clear(); seenDay = day }
  const visitor = visitorKey(visitorIp(event))
  const key = `${kind}|${slug}|${visitor}`
  if (seen.has(key) || overLimit(visitor)) return false
  seen.add(key)
  const tool = await prisma.tool.findFirst({ where: { slug, status: 'PUBLISHED', deletedAt: null }, select: { id: true } })
  if (!tool) return false
  const date = new Date(`${day}T00:00:00Z`)
  const field = kind === 'visit' ? 'visits' : 'views'
  const upsert = () => prisma.toolDailyStat.upsert({
    where: { day_toolId: { day: date, toolId: tool.id } },
    create: { day: date, toolId: tool.id, [field]: 1 },
    update: { [field]: { increment: 1 } }
  })
  // Two first events of a tool's day at once both try to create the row: the loser updates.
  await upsert().catch(err => (err?.code === 'P2002' ? upsert() : Promise.reject(err)))
  return true
}

// The `size` hottest published tools as cards, hottest first.
export async function hotTools(locale: string, size: number) {
  const since = new Date(Date.now() - HOT_DAYS * 24 * 60 * 60 * 1000)
  const day = new Date(`${since.toISOString().slice(0, 10)}T00:00:00Z`)
  const ranked = await prisma.$queryRaw<{ id: string }[]>`
    WITH score AS (
      SELECT "toolId", SUM(s) AS s FROM (
        SELECT "toolId", SUM(visits) * ${VISIT_WEIGHT} + SUM(views) AS s
        FROM "ToolDailyStat" WHERE day >= ${day} GROUP BY "toolId"
        UNION ALL
        SELECT "toolId", COUNT(*) * ${SAVE_WEIGHT} AS s
        FROM "ToolSave" WHERE "createdAt" >= ${since} GROUP BY "toolId"
      ) x GROUP BY "toolId"
    )
    SELECT t.id FROM score JOIN "Tool" t ON t.id = score."toolId"
    WHERE t.status = 'PUBLISHED' AND t."deletedAt" IS NULL AND score.s >= ${MIN_SCORE}
    ORDER BY score.s DESC, t."monthlyVisits" DESC, t.id
    LIMIT ${size}`
  const ids = ranked.map(r => r.id)
  if (ids.length < size) {
    const fill = await prisma.tool.findMany({
      where: { status: 'PUBLISHED', deletedAt: null, ...(ids.length ? { id: { notIn: ids } } : {}) },
      orderBy: [{ monthlyVisits: 'desc' }, { id: 'asc' }],
      take: size - ids.length,
      select: { id: true }
    })
    ids.push(...fill.map(t => t.id))
  }
  const rows = await prisma.tool.findMany({ where: { id: { in: ids } }, select: TOOL_CARD_SELECT })
  const byId = new Map(rows.map(r => [r.id, r]))
  return ids.flatMap(id => (byId.has(id) ? [toToolCard(byId.get(id)!, locale)] : []))
}

// Nightly (server/tasks/tools/stats-cleanup.ts): only the last HOT_DAYS days are ranked.
export async function cleanUpToolStats(keepDays = 60) {
  const { count } = await prisma.toolDailyStat.deleteMany({
    where: { day: { lt: new Date(Date.now() - keepDays * 24 * 60 * 60 * 1000) } }
  })
  return count
}

export const isToolEvent = (v: unknown): v is ToolEvent => v === 'view' || v === 'visit'
