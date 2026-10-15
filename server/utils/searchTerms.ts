import type { H3Event } from 'h3'

// Home "Popular searches" (the chips under the hero search box): what visitors search for
// most — intent, not how many tools a category has. A search counts once per visitor, term
// and day, and only when it finds published tools, so typos, spam and nonsense never reach
// the home page. Chips lead to the search page, so a click counts as a search too.
// Ranked by the last POPULAR_DAYS days; until enough is known, DEFAULT_SEARCHES fill in.

const POPULAR_DAYS = 30
const POPULAR_MIN_COUNT = 3 // searched by at least this many visitors in that span
const POPULAR_SIZE = 8
export const DEFAULT_SEARCHES = ['AI Agent', 'Video', 'Image', 'Chatbot', 'Coding', 'Voice', 'Writing', 'Music']

// "  AI   Agent " → display "AI Agent", term "ai agent". Null for what isn't a keyword:
// too short / long, too many words, no letter, a URL or an e-mail address.
export function searchTermOf(raw: unknown) {
  const display = String(raw ?? '').replace(/\s+/g, ' ').trim()
  if (display.length < 2 || display.length > 40 || display.split(' ').length > 5) return null
  if (!/\p{L}/u.test(display) || /[@/\\<>]|:\/\/|\bwww\./i.test(display)) return null
  return { term: display.toLowerCase(), display }
}

// Counted once per visitor, term and day (in memory, one server).
const seen = new Set<string>()
let seenDay = ''
// Each new term costs a search query: at most this many per visitor per hour, so a
// script sending endless made-up terms can't load the database. People never get near it.
const TERMS_PER_HOUR = 30
const recentTerms = new Map<string, number[]>()
function overLimit(visitor: string) {
  const now = Date.now()
  const list = (recentTerms.get(visitor) ?? []).filter(t => now - t < 60 * 60 * 1000)
  if (recentTerms.size > 50_000) recentTerms.clear()
  if (list.length >= TERMS_PER_HOUR) { recentTerms.set(visitor, list); return true }
  list.push(now)
  recentTerms.set(visitor, list)
  return false
}

export async function logSearch(event: H3Event, raw: unknown, locale: string) {
  const parsed = searchTermOf(raw)
  if (!parsed || !isHumanRequest(event)) return false
  const day = new Date().toISOString().slice(0, 10)
  if (day !== seenDay || seen.size > 200_000) { seen.clear(); seenDay = day }
  const visitor = visitorKey(visitorIp(event))
  const key = `${locale}|${parsed.term}|${visitor}`
  if (seen.has(key) || overLimit(visitor)) return false
  seen.add(key)
  if (!await searchHasResults(parsed.term)) return false
  const date = new Date(`${day}T00:00:00Z`)
  const upsert = () => prisma.searchTermDaily.upsert({
    where: { day_locale_term: { day: date, locale, term: parsed.term } },
    create: { day: date, locale, term: parsed.term, display: parsed.display, count: 1 },
    update: { count: { increment: 1 }, display: parsed.display }
  })
  // Two first searches of a term at once both try to create the row: the loser updates.
  await upsert().catch(err => (err?.code === 'P2002' ? upsert() : Promise.reject(err)))
  return true
}

// The most searched terms of the last POPULAR_DAYS days in this language, topped up with
// DEFAULT_SEARCHES while there are too few.
export async function popularSearches(locale: string): Promise<string[]> {
  const since = new Date(Date.now() - POPULAR_DAYS * 24 * 60 * 60 * 1000)
  const rows = await prisma.searchTermDaily.groupBy({
    by: ['term'],
    where: { locale, day: { gte: since } },
    _sum: { count: true },
    having: { count: { _sum: { gte: POPULAR_MIN_COUNT } } },
    orderBy: { _sum: { count: 'desc' } },
    take: POPULAR_SIZE
  })
  // Each term as it was typed most recently.
  const shown = rows.length
    ? await prisma.searchTermDaily.findMany({
        where: { locale, term: { in: rows.map(r => r.term) } },
        orderBy: { day: 'desc' },
        distinct: ['term'],
        select: { term: true, display: true }
      })
    : []
  const displayOf = new Map(shown.map(s => [s.term, s.display]))
  const popular = rows.map(r => displayOf.get(r.term) ?? r.term)
  const taken = new Set(popular.map(p => p.toLowerCase()))
  return [...popular, ...DEFAULT_SEARCHES.filter(d => !taken.has(d.toLowerCase()))].slice(0, POPULAR_SIZE)
}

// Nightly (server/tasks/search/cleanup.ts): only the last POPULAR_DAYS days are ranked.
export async function cleanUpSearchTerms(keepDays = 60) {
  const { count } = await prisma.searchTermDaily.deleteMany({
    where: { day: { lt: new Date(Date.now() - keepDays * 24 * 60 * 60 * 1000) } }
  })
  return count
}
