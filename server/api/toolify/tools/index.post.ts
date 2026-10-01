import { Prisma } from '@prisma/client'

function toOptionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined
  const str = String(value).trim()
  return str ? str : undefined
}

function toOptionalInt(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const num = Number(value)
  if (!Number.isFinite(num)) return undefined
  return Math.trunc(num)
}

function toOptionalBigInt(value: unknown): bigint | undefined {
  if (value === undefined || value === null || value === '') return undefined
  try {
    return BigInt(Math.trunc(Number(value)))
  } catch {
    return undefined
  }
}

function toOptionalDate(value: unknown): Date | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? undefined : date
}

// Prisma rejects a bare null for Json? columns; DbNull stores SQL NULL.
function toOptionalJson(value: unknown): unknown {
  if (value === undefined) return undefined
  return value === null ? Prisma.DbNull : value
}

// BigInt fields (e.g. monthVisitedCount) can't be JSON.stringify'd as-is.
function serializeToolifyTool(tool: Record<string, any>) {
  return {
    ...tool,
    monthVisitedCount: tool.monthVisitedCount != null ? tool.monthVisitedCount.toString() : null
  }
}

// Upsert a ToolifyTool keyed by slug, so re-scraping a tool fills in fields
// (e.g. imageUrl) that were missing on the first insert instead of 409-ing.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)

  const slug = toOptionalString(body.slug)
  const name = toOptionalString(body.name)
  const sourceUrl = toOptionalString(body.sourceUrl)
  const scrapedAt = toOptionalDate(body.scrapedAt)

  if (!slug) throw createError({ statusCode: 400, statusMessage: 'Slug is required' })
  if (!name) throw createError({ statusCode: 400, statusMessage: 'Name is required' })
  if (!sourceUrl) throw createError({ statusCode: 400, statusMessage: 'sourceUrl is required' })
  if (!scrapedAt) throw createError({ statusCode: 400, statusMessage: 'scrapedAt is required' })

  const data: Record<string, any> = {
    slug,
    name,
    sourceUrl,
    scrapedAt,
    websiteDomain: toOptionalString(body.websiteDomain),
    websiteUrl: toOptionalString(body.websiteUrl),
    imageUrl: toOptionalString(body.imageUrl),
    iconUrl: toOptionalString(body.iconUrl),
    tagline: toOptionalString(body.tagline),
    whatIs: toOptionalString(body.whatIs),
    whatIsSummary: toOptionalString(body.whatIsSummary),
    howToUse: toOptionalString(body.howToUse),
    bestFor: toOptionalString(body.bestFor),
    tags: toOptionalString(body.tags),
    // undefined (not []) when absent, so an update doesn't wipe stored tags
    pricingTags: Array.isArray(body.pricingTags) ? body.pricingTags.map(String) : undefined,
    monthVisitedCount: toOptionalBigInt(body.monthVisitedCount),
    collectedCount: toOptionalInt(body.collectedCount),
    reviewScore: body.reviewScore != null ? String(body.reviewScore) : undefined,
    reviewCount: toOptionalInt(body.reviewCount),
    ratingCount: toOptionalInt(body.ratingCount),
    toolifyCreatedAt: toOptionalDate(body.toolifyCreatedAt),
    toolifyUpdatedAt: toOptionalDate(body.toolifyUpdatedAt),
    categories: toOptionalJson(body.categories),
    coreFeatures: toOptionalJson(body.coreFeatures),
    useCases: toOptionalJson(body.useCases),
    pricingPlans: toOptionalJson(body.pricingPlans),
    faqs: toOptionalJson(body.faqs),
    trafficSnapshots: toOptionalJson(body.trafficSnapshots),
    // absent when Toolify has no traffic data; undefined keeps the stored value
    analyticsData: toOptionalJson(body.analyticsData)
  }

  try {
    const tool = await prisma.toolifyTool.upsert({
      where: { slug },
      create: { ...data, pricingTags: data.pricingTags ?? [] },
      // Reset isSync so the changed data gets synced to Tool again.
      update: { ...data, isSync: 0 }
    })
    return serializeToolifyTool(tool)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Failed to save ToolifyTool' })
  }
})
