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

function toOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined
  return value === true || value === 'true' || value === 1 || value === '1'
}

function toOptionalDate(value: unknown): Date | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? undefined : date
}

function toOptionalJson(value: unknown): unknown {
  return value === undefined ? undefined : value
}

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const body = await readBody(event)

  const phId = toOptionalString(body.phId)
  const slug = toOptionalString(body.slug)
  const name = toOptionalString(body.name)
  const tagline = toOptionalString(body.tagline)
  const sourceUrl = toOptionalString(body.sourceUrl)
  const scrapedAt = toOptionalDate(body.scrapedAt)

  if (!phId) throw createError({ statusCode: 400, statusMessage: 'phId is required' })
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'Slug is required' })
  if (!name) throw createError({ statusCode: 400, statusMessage: 'Name is required' })
  if (!tagline) throw createError({ statusCode: 400, statusMessage: 'Tagline is required' })
  if (!sourceUrl) throw createError({ statusCode: 400, statusMessage: 'sourceUrl is required' })
  if (!scrapedAt) throw createError({ statusCode: 400, statusMessage: 'scrapedAt is required' })

  const data: Record<string, any> = {
    phId,
    slug,
    name,
    tagline,
    sourceUrl,
    scrapedAt,
    description: toOptionalString(body.description),

    websiteUrl: toOptionalString(body.websiteUrl),
    websiteDomain: toOptionalString(body.websiteDomain),
    cleanUrl: toOptionalString(body.cleanUrl),
    logoUuid: toOptionalString(body.logoUuid),

    twitterUrl: toOptionalString(body.twitterUrl),
    linkedinUrl: toOptionalString(body.linkedinUrl),
    githubUrl: toOptionalString(body.githubUrl),
    facebookUrl: toOptionalString(body.facebookUrl),
    instagramUrl: toOptionalString(body.instagramUrl),

    pricingType: toOptionalString(body.pricingType),
    employeeSize: toOptionalString(body.employeeSize),
    fundingAmount: toOptionalString(body.fundingAmount),
    wasInYCombinator: toOptionalBoolean(body.wasInYCombinator),
    isClaimed: toOptionalBoolean(body.isClaimed),
    isTopProduct: toOptionalBoolean(body.isTopProduct),

    reviewsCount: toOptionalInt(body.reviewsCount),
    reviewsRating: body.reviewsRating != null ? String(body.reviewsRating) : undefined,
    detailedReviewsCount: toOptionalInt(body.detailedReviewsCount),
    detailedReviewsRating: body.detailedReviewsRating != null ? String(body.detailedReviewsRating) : undefined,
    followersCount: toOptionalInt(body.followersCount),

    categories: toOptionalJson(body.categories),
    media: toOptionalJson(body.media),
    launches: toOptionalJson(body.launches),
    badges: toOptionalJson(body.badges)
  }

  try {
    const product = await prisma.phProductTool.create({ data })
    return product
  } catch (err: any) {
    if (err?.code === 'P2002') {
      throw createError({ statusCode: 409, statusMessage: 'A PhProductTool with this phId or slug already exists' })
    }
    throw createError({ statusCode: 400, statusMessage: 'Failed to create PhProductTool' })
  }
})
