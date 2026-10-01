import { Prisma } from '@prisma/client'

// TEMPORARY endpoint (to be removed): writes a tool's Toolify analytics straight
// into ToolAnalyticsData. Body: { slug, analyticsData }.
//
// Same "real data" guard and field mapping as rich-tool-sync's
// syncToolAnalyticsFromSource() in the crawler, but it upserts: an existing row
// gets the mapped fields overwritten, a new row gets the remaining columns set
// to the writeEmptyAnalyticsPlaceholder() defaults.

type AnalyticsPayload = Record<string, any>

function hasRealAnalyticsData(a: unknown): a is AnalyticsPayload {
  if (!a || typeof a !== 'object') return false
  const data = a as AnalyticsPayload
  if (Number(data.monthlyVisits) > 0) return true
  if (data.trafficVisits && typeof data.trafficVisits === 'object' && Object.keys(data.trafficVisits).length > 0) return true
  if (Array.isArray(data.organicKeywords) && data.organicKeywords.length > 0) return true
  return false
}

// Toolify sends geography as [{ countryCode: "US", numericCode: 840, sharePct: 31.62 }];
// ToolAnalyticsData stores it the similarweb-sync way: { data: [{ country: 840, share: 0.3162 }], filters }.
function toSimilarwebGeography(geography: unknown) {
  const list = Array.isArray(geography) ? geography : []
  const data = list.flatMap((g: any) => {
    const country = g?.numericCode ?? g?.countryCode
    const pct = Number(g?.sharePct)
    return country != null && Number.isFinite(pct) ? [{ country, share: Math.round(pct * 100) / 10000 }] : []
  })
  return { data, filters: {} }
}

// ToolAnalyticsData is keyed by Tool.slug, which rich-tool-sync derives from the
// tool name — not necessarily the ToolifyTool slug the scraper sends. Use the
// slug as-is when a Tool has it, else follow ToolifyTool.sourceUrl to the Tool
// whose toolifyUrl matches; fall back to the given slug if neither exists yet.
async function resolveToolSlug(slug: string): Promise<string> {
  const tool = await prisma.tool.findUnique({ where: { slug }, select: { slug: true } })
  if (tool) return tool.slug

  const toolify = await prisma.toolifyTool.findUnique({ where: { slug }, select: { sourceUrl: true } })
  if (toolify) {
    const linked = await prisma.tool.findFirst({ where: { toolifyUrl: toolify.sourceUrl }, select: { slug: true } })
    if (linked) return linked.slug
  }
  return slug
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)

  const slug = typeof body?.slug === 'string' ? body.slug.trim() : ''
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'slug is required' })

  const a = body.analyticsData
  if (!hasRealAnalyticsData(a)) return { slug, saved: false, reason: 'no real analytics data' }

  const toolSlug = await resolveToolSlug(slug)

  const highestTrafficCountry = Number.isFinite(Number(a.highestTrafficCountry)) && a.highestTrafficCountry != null
    ? Math.trunc(Number(a.highestTrafficCountry))
    : null

  const mapped = {
    monthlyVisits: Math.max(0, Math.floor(Number(a.monthlyVisits) || 0)),
    trafficVisits: a.trafficVisits || {},
    trafficSources: a.trafficSources || {},
    engagement: a.engagement || {},
    organicKeywords: a.organicKeywords || [],
    geography: toSimilarwebGeography(a.geography),
    highestTrafficCountry,
    category: a.category || null,
    similarSites: a.similarSites || [],
    growthMetrics: a.growthMetrics || Prisma.JsonNull
  }

  // On update, only overwrite what the payload actually carries — otherwise a
  // payload with just organicKeywords would reset an existing row's
  // monthlyVisits/geography/... to the empty defaults above.
  const update = Object.fromEntries(
    Object.entries(mapped).filter(([key]) => a[key] !== undefined && a[key] !== null)
  )

  try {
    await prisma.toolAnalyticsData.upsert({
      where: { toolSlug },
      create: {
        toolSlug,
        ...mapped,
        // Columns Toolify doesn't report — same defaults as writeEmptyAnalyticsPlaceholder().
        paidKeywords: [],
        globalRanking: null,
        highestTrafficCountryRanking: null,
        categoryRanking: null,
        relatedApps: Prisma.JsonNull,
        employeeRange: null,
        desktopVsMobile: Prisma.JsonNull,
        yearFounded: null,
        hasGaToken: false,
        privacyStatus: null,
        aiTraffic: [],
        aiTrafficHistory: [],
        history: [],
        topPrompts: []
      },
      update
    })
    return { slug, toolSlug, saved: true }
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Failed to save ToolAnalyticsData' })
  }
})
