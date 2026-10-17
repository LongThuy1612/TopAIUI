import { SITE_TIME_ZONE, siteDayStart } from '#shared/time'
import { Prisma } from '@prisma/client'
import type { H3Event } from 'h3'
import { PUBLIC_LIMITS } from '#shared/research'

// Free-text search (?q=): server/utils/toolSearch.ts (searchMatchesSql).

// Every matching tool id, for the general path below (filters searchPage doesn't take).
// Capped: past that many, a text this common has plenty of matches in front of these.
async function searchMatchIds(q: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`WITH matches AS (${searchMatchesSql(q)}) SELECT id FROM matches LIMIT 5000`
  return rows.map(row => row.id)
}

// A search page of tool ids, in order, and the total — two queries, all in the database.
async function searchPage(opts: {
  q: string
  category?: string
  pricing?: string
  nameFirst: boolean
  orderBy: Prisma.ToolOrderByWithRelationInput[]
  skip: number
  take: number
}): Promise<{ ids: string[]; total: number }> {
  const nameLike = `%${likeText(opts.q)}%`
  const matches = Prisma.sql`WITH matches AS (${searchMatchesSql(opts.q)})`
  const from = Prisma.sql`
    FROM matches m JOIN "Tool" t ON t.id = m.id
    WHERE t.status = 'PUBLISHED' AND t."deletedAt" IS NULL
    ${opts.category ? Prisma.sql`AND EXISTS (SELECT 1 FROM "_ToolToCategory" tc JOIN "Category" c ON c.id = tc."A" WHERE tc."B" = t.id AND c.slug = ${opts.category})` : Prisma.empty}
    ${opts.pricing ? Prisma.sql`AND t."pricingType" = ${opts.pricing}::"PricingType"` : Prisma.empty}`
  // ORDER BY from the orderBy built above — field names from sortMap, never from the request.
  const order = opts.orderBy.flatMap(entry => Object.entries(entry).map(([field, dir]) => {
    if (dir !== 'asc' && dir !== 'desc') throw new Error(`searchPage: unsupported order on ${field}`)
    return Prisma.raw(`t."${field}" ${dir === 'asc' ? 'ASC' : 'DESC'}`)
  }))
  const [rows, counted] = await Promise.all([
    opts.take > 0
      ? prisma.$queryRaw<{ id: string }[]>`
          ${matches} SELECT t.id ${from}
          ORDER BY ${opts.nameFirst ? Prisma.sql`(t.name ILIKE ${nameLike}) DESC, ` : Prisma.empty}${Prisma.join(order)}
          LIMIT ${opts.take} OFFSET ${opts.skip}`
      : [],
    prisma.$queryRaw<{ total: bigint }[]>`${matches} SELECT count(*) AS total ${from}`
  ])
  return { ids: rows.map(row => row.id), total: Number(counted[0]?.total ?? 0) }
}

// The list itself. `isGuest`: no valid login token — guests only reach the first
// PUBLIC_LIMITS.guestListTools tools of any list, then get loginRequired and nothing more.
async function listTools(event: H3Event, isGuest: boolean) {
  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(300, Math.max(1, Math.floor(Number(query.limit)) || 24))
  const guestRoom = isGuest ? Math.max(0, PUBLIC_LIMITS.guestListTools - (page - 1) * limit) : Infinity
  const locale = String(query.locale ?? 'en')

  // status is hardcoded to 'PUBLISHED' — this endpoint never leaks pending
  // (unapproved) submissions to the public. Admin-only visibility lives in
  // server/api/admin/tools/index.get.ts instead.
  const where: Prisma.ToolWhereInput = { status: 'PUBLISHED', deletedAt: null }
  if (query.category) where.categories = { some: { slug: String(query.category) } }
  if (query.tag) where.tags = { some: { slug: String(query.tag) } }
  // Unknown values are ignored (Prisma would reject them with a 500).
  if (['FREE', 'FREEMIUM', 'PAID'].includes(String(query.pricing))) where.pricingType = String(query.pricing) as Prisma.ToolWhereInput['pricingType']
  if (query.featured === 'true') where.isFeatured = true
  // "Discord of AI": tools with a Discord community link (the rows then carry it).
  const hasDiscord = query.hasDiscord === 'true'
  if (hasDiscord) where.NOT = [{ discordUrl: null }, { discordUrl: '' }]
  const q = typeof query.q === 'string' ? query.q.trim().slice(0, 80) : ''
  if (query.minRating && Number.isFinite(Number(query.minRating))) where.averageRating = { gt: Number(query.minRating) }
  if (query.region) where.region = String(query.region)
  if (query.source) where.source = String(query.source)
  const isTodayTab = query.today === 'true'
  // Today and New are the same list, always sorted by addedOn (tools without
  // one go last); Today just narrows it to approved tools.
  if (isTodayTab) where.isApproved = true
  if (query.days && Number.isFinite(Number(query.days))) {
    const since = new Date()
    since.setDate(since.getDate() - Number(query.days))
    where.createdAt = { gte: since }
  }
  const isNewTab = query.newToday === 'true'
  // Footer archive: tools whose addedOn falls on one calendar day (YYYY-MM-DD) in
  // Vietnam time (shared/time.ts).
  const addedDate = siteDayStart(String(query.addedDate ?? ''))
  const isArchiveDay = !!addedDate
  if (isArchiveDay) {
    where.addedOn = { gte: addedDate, lt: new Date(addedDate.getTime() + 24 * 60 * 60 * 1000) }
  }

  // Footer "Browse by Alphabet": tools whose name starts with one letter A–Z.
  const letter = /^[a-z]$/i.test(String(query.letter ?? '')) ? String(query.letter).toUpperCase() : null
  const and: Prisma.ToolWhereInput[] = []
  if (letter) and.push({ name: { startsWith: letter, mode: 'insensitive' } })

  // Search: by name, website or tag (searchMatchesSql). What the site sends — the search
  // page, a category's search box: q with at most a category, a price filter and a sort —
  // runs in the database in one go (searchPage). Any other filter alongside q (nothing on
  // the site combines them) takes the general path: the matching ids, then Prisma.
  const simpleSearch = !!q && !query.featured && !hasDiscord && !query.minRating && !query.region && !query.source
    && !isTodayTab && !query.days && !isNewTab && !isArchiveDay && !letter && !query.tag
  if (q && !simpleSearch) and.push({ id: { in: await searchMatchIds(q) } })
  if (and.length) where.AND = and

  const sortMap: Record<string, Prisma.ToolOrderByWithRelationInput | Prisma.ToolOrderByWithRelationInput[]> = {
    newest: { createdAt: 'desc' },
    // Paid ads get their own slots (server/utils/ads.ts), not a head start in organic order.
    featured: [{ isFeatured: 'desc' }, { viewCount: 'desc' }],
    name: { name: 'asc' },
    traffic: { monthlyVisits: 'desc' },
    trending: { monthlyVisits: 'desc' },
    rating: { averageRating: 'desc' },
    // Most Saved AIs: by saves, then rating — while few tools have saves the list still reads well.
    saved: [{ collectionCount: 'desc' }, { averageRating: 'desc' }],
    growth1m: { last1MonthGrowth: 'desc' },
    growth3m: { last3MonthGrowth: 'desc' },
    growth6m: { last6MonthGrowth: 'desc' },
    revenue: { monthlyRevenue: 'desc' }
  }
  // id last breaks ties, in every order: thousands of tools share an addedOn, a
  // viewCount of 0 or a 5.0 rating, and Postgres returns tied rows in any order —
  // pages of the infinite scroll then repeat some tools and skip others.
  const primary = isTodayTab || isNewTab || isArchiveDay
    ? [{ addedOn: { sort: 'desc' as const, nulls: 'last' as const } }]
    : letter
      ? [{ name: 'asc' as const }]
      : [sortMap[String(query.sort)] ?? { createdAt: 'desc' as const }].flat()
  const orderBy: Prisma.ToolOrderByWithRelationInput[] = [...primary, { id: 'asc' }]

  const select = { ...TOOL_CARD_SELECT, discordUrl: hasDiscord }
  const skip = (page - 1) * limit
  const take = Math.min(limit, guestRoom)
  let items: Prisma.ToolGetPayload<{ select: typeof select }>[]
  let total: number
  // Today (the /today page, the home list): newest launch day first in Vietnam time, the
  // most upvoted first within a day — an older tool's votes must not put it above today's
  // launches. Prisma can't sort on the day of a timestamp, so the page's ids come from
  // SQL (Today alone; with any other filter it keeps the plain addedOn order).
  const todayOnly = isTodayTab && !q && !query.category && !query.tag && !where.pricingType && !query.featured && !hasDiscord
    && !query.minRating && !query.region && !query.source && !query.days && !isNewTab && !isArchiveDay && !letter
  if (todayOnly) {
    const [rows, counted] = await Promise.all([
      take > 0
        ? prisma.$queryRaw<{ id: string }[]>`
            SELECT id FROM "Tool"
            WHERE status = 'PUBLISHED' AND "deletedAt" IS NULL AND "isApproved" = true
            ORDER BY ((("addedOn" AT TIME ZONE 'UTC') AT TIME ZONE ${SITE_TIME_ZONE})::date) DESC NULLS LAST,
              "upvoteCount" DESC, "addedOn" DESC NULLS LAST, id ASC
            LIMIT ${take} OFFSET ${skip}`
        : Promise.resolve([]),
      prisma.tool.count({ where })
    ])
    total = counted
    const found = rows.length ? await prisma.tool.findMany({ where: { id: { in: rows.map(r => r.id) } }, select }) : []
    const byId = new Map(found.map(row => [row.id, row]))
    items = rows.map(r => byId.get(r.id)).filter(row => !!row)
  } else if (simpleSearch) {
    const found = await searchPage({
      q,
      category: query.category ? String(query.category) : undefined,
      pricing: where.pricingType as string | undefined,
      // No sort asked (the search page): name matches first — "chat" mustn't bury tools
      // called Chat… under every tool tagged "chatbot". A list's own sort (a category's
      // search box) is kept over both kinds of match.
      nameFirst: !query.sort,
      orderBy,
      skip,
      take
    })
    total = found.total
    const rows = found.ids.length ? await prisma.tool.findMany({ where: { id: { in: found.ids } }, select }) : []
    const byId = new Map(rows.map(row => [row.id, row]))
    items = found.ids.map(id => byId.get(id)).filter(row => !!row)
  } else {
    [items, total] = await Promise.all([
      take <= 0 ? Promise.resolve([]) : prisma.tool.findMany({ where, orderBy, skip, take, select }),
      prisma.tool.count({ where })
    ])
  }

  return {
    items: items.map(row => ({
      ...toToolCard(row, locale),
      ...(hasDiscord && { discordUrl: safeLinkUrl(row.discordUrl) })
    })),
    total,
    page,
    pageCount: Math.ceil(total / limit),
    // The list goes on, but a guest has to log in to see more of it.
    loginRequired: isGuest && total > PUBLIC_LIMITS.guestListTools && (page - 1) * limit + Math.min(limit, guestRoom) >= PUBLIC_LIMITS.guestListTools
  }
}

// Guests: identical for every visitor, and hit by every page (app.vue, hero, lists) — so
// it's cached in memory per full URL (path + query). The page HTML cache in nuxt.config.ts
// only helps full page loads; client-side navigation calls this API directly. Free-text
// search (?q=) skips the cache so arbitrary queries can't fill it up. Off in dev so DB edits
// show up immediately. (Inside a cached handler the request only carries the `varies`
// headers — the login token is read before, in the handler below.)
const listForGuests = defineCachedEventHandler(event => listTools(event, true), {
  name: 'api-tools',
  maxAge: 60,
  swr: true,
  shouldBypassCache: (event) => import.meta.dev || !!String(getQuery(event).q ?? '').trim() // same test as listTools: blank q lists everything
})

export default defineEventHandler((event) => {
  const userToken = getHeader(event, 'x-user-token')
  // Logged in: no guest limit, answered directly (never from or into the shared cache).
  if (userToken && verifyUserToken(userToken)) return listTools(event, false)
  return listForGuests(event)
})
