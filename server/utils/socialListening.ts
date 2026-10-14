// Dashboard → Social Listening data (server/api/social-listening.get.ts): how much each
// tool is talked about on social platforms, from tool_social_stats (filled by the social
// crawler), with the tool's own name, website, logo and categories when it has a page.

export interface SocialRow {
  slug: string
  // The Tool row's id when /tools/<slug> exists: stats can be crawled for a tool that was
  // never listed here.
  toolId: string | null
  name: string
  website: string | null
  logo: string | null
  // The crawler's summary: the intro when the tool has no description in the language.
  summary: string | null
  // Names in the page's language are added per request (categoryNames).
  categorySlugs: string[]
  videoCount: number
  creatorsCount: number
  monthlyTraffic: number
  avgViews: number
  avgInteractions: number
  totalViews: number
  totalInteractions: number
}

// Same for every user and every language, so built once and cached; the handler only
// filters / sorts / pages it, and adds the intro and category names of the page shown.
//
// One query, stats joined to their tool in SQL: the stats read on their own and then a
// `slug IN (…)` over all of them (as before) bound one parameter per tool — which fails
// past PostgreSQL's 32,767 — and took twice as long. Stats of a tool that exists but
// isn't public (pending, rejected, deleted) are left out. The counters are BigInt
// columns; they stay far below 2^53, so plain numbers are exact.
export const loadSocialRows = memoryCached('social listening', async (): Promise<SocialRow[]> => {
  const [rows, { slugsByTool }] = await Promise.all([
    prisma.$queryRaw<{
      slug: string; statsName: string | null; statsWebsite: string | null; websiteLogo: string | null; summary: string | null
      videoCount: number; creatorsCount: number; monthlyTraffic: number; avgViews: number; avgInteractions: number
      totalViews: number; totalInteractions: number
      toolId: string | null; toolName: string | null; toolWebsite: string | null; logoUrl: string | null; icon: string | null
    }[]>`
      SELECT s.tool_slug AS slug, s.tool_name AS "statsName", s.website AS "statsWebsite", s.website_logo AS "websiteLogo",
             s.what_is_summary AS summary,
             s.related_video_count::float8 AS "videoCount", s.related_influencer_count::float8 AS "creatorsCount",
             s.month_visited_count::float8 AS "monthlyTraffic", s.average_views AS "avgViews", s.average_engagement AS "avgInteractions",
             s.total_views::float8 AS "totalViews", s.total_engagement::float8 AS "totalInteractions",
             t.id AS "toolId", t.name AS "toolName", t.website AS "toolWebsite", t."logoUrl", t.icon
      FROM tool_social_stats s
      LEFT JOIN "Tool" t ON t.slug = s.tool_slug
      WHERE t.id IS NULL OR (t.status = 'PUBLISHED' AND t."deletedAt" IS NULL)`,
    loadToolCategories()
  ])
  return rows.map(r => ({
    slug: r.slug,
    toolId: r.toolId,
    name: r.toolName ?? r.statsName ?? r.slug,
    website: safeHttpUrl(r.toolWebsite ?? r.statsWebsite),
    logo: resolveToolImage(r.logoUrl) ?? resolveToolImage(r.icon) ?? resolveToolImage(r.websiteLogo),
    summary: cleanText(r.summary),
    categorySlugs: r.toolId ? slugsByTool[r.toolId] ?? [] : [],
    videoCount: r.videoCount,
    creatorsCount: r.creatorsCount,
    monthlyTraffic: r.monthlyTraffic,
    avgViews: r.avgViews,
    avgInteractions: r.avgInteractions,
    totalViews: r.totalViews,
    totalInteractions: r.totalInteractions
  }))
}, 10 * 60 * 1000)

// The intro of each tool of the page shown, in one language: its description there, else
// in English, else any (pickByLocale), else the crawler's summary. One small query for
// the page's tools (≤ 100) instead of every tool's text cached in every language.
export async function socialIntros(rows: SocialRow[], locale: string) {
  const ids = rows.map(r => r.toolId).filter((id): id is string => !!id)
  const translations = ids.length
    ? await prisma.toolTranslation.findMany({ where: { toolId: { in: ids } }, select: { toolId: true, locale: true, shortDesc: true } })
    : []
  const byTool = new Map<string, typeof translations>()
  for (const t of translations) {
    const list = byTool.get(t.toolId)
    if (list) list.push(t)
    else byTool.set(t.toolId, [t])
  }
  return new Map(rows.map(r => [
    r.slug,
    cleanText(r.toolId ? pickByLocale(byTool.get(r.toolId) ?? [], locale)?.shortDesc : null) ?? r.summary
  ]))
}
