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

function toOptionalJson(value: unknown): unknown {
  return value === undefined ? undefined : value
}

// BigInt fields (e.g. monthVisitedCount) can't be JSON.stringify'd as-is.
function serializeToolifyTool(tool: Record<string, any>) {
  return {
    ...tool,
    monthVisitedCount: tool.monthVisitedCount != null ? tool.monthVisitedCount.toString() : null
  }
}

export default defineEventHandler(async (event) => {
  requireAdmin(event)

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
    tagline: toOptionalString(body.tagline),
    whatIs: toOptionalString(body.whatIs),
    whatIsSummary: toOptionalString(body.whatIsSummary),
    howToUse: toOptionalString(body.howToUse),
    bestFor: toOptionalString(body.bestFor),
    tags: toOptionalString(body.tags),
    pricingTags: Array.isArray(body.pricingTags) ? body.pricingTags.map(String) : [],
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
    trafficSnapshots: toOptionalJson(body.trafficSnapshots)
  }

  try {
    const tool = await prisma.toolifyTool.create({ data })
    return serializeToolifyTool(tool)
  } catch (err: any) {
    if (err?.code === 'P2002') {
      throw createError({ statusCode: 409, statusMessage: 'A ToolifyTool with this slug already exists' })
    }
    throw createError({ statusCode: 400, statusMessage: 'Failed to create ToolifyTool' })
  }
})
