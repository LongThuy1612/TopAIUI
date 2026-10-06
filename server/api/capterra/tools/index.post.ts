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

function toOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined
  return value === true || value === 'true' || value === 1 || value === '1'
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

// Capterra shows no rating while reviewCount = 0, so an explicit null must clear it.
function toNullableFloat(value: unknown): number | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  const num = Number(value)
  return Number.isFinite(num) ? num : undefined
}

// Upsert a CapterraTool keyed by capterraId. Accepts the crawler's nested shape
// (category: {name, url}, rating: {overall, reviewCount}) as well as flat column names.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  const category = body.category ?? {}
  const rating = body.rating ?? {}

  const capterraId = toOptionalInt(body.capterraId)
  const slug = toOptionalString(body.slug)
  const url = toOptionalString(body.url)
  const name = toOptionalString(body.name)

  if (!capterraId) throw createError({ statusCode: 400, statusMessage: 'capterraId is required' })
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'Slug is required' })
  if (!url) throw createError({ statusCode: 400, statusMessage: 'url is required' })
  if (!name) throw createError({ statusCode: 400, statusMessage: 'Name is required' })

  const data: Record<string, any> = {
    capterraId,
    slug,
    url,
    name,
    websiteUrl: toOptionalString(body.websiteUrl),

    categoryName: toOptionalString(category.name ?? body.categoryName),
    categoryUrl: toOptionalString(category.url ?? body.categoryUrl),

    lastUpdated: toOptionalDate(body.lastUpdated),
    description: toOptionalString(body.description),
    usedFor: toOptionalJson(body.usedFor),

    ratingOverall: toNullableFloat('overall' in rating ? rating.overall : body.ratingOverall),
    reviewCount: toOptionalInt(rating.reviewCount ?? body.reviewCount),
    startingPrice: toOptionalString(body.startingPrice),
    freeTrial: toOptionalBoolean(body.freeTrial),
    freeVersion: toOptionalBoolean(body.freeVersion),
    pricingPlans: toOptionalJson(body.pricingPlans),

    alternatives: toOptionalJson(body.alternatives),
    headToHead: toOptionalJson(body.headToHead),
    support: toOptionalJson(body.support),
    training: toOptionalJson(body.training),
    deployment: toOptionalJson(body.deployment),
    typicalUsers: toOptionalJson(body.typicalUsers),

    features: toOptionalJson(body.features),
    ratingBreakdown: toOptionalJson(body.ratingBreakdown),
    subRatings: toOptionalJson(body.subRatings),
    reviews: toOptionalJson(body.reviews),
    faqs: toOptionalJson(body.faqs),

    sourceUrl: toOptionalString(body.sourceUrl),
    scrapedAt: toOptionalDate(body.scrapedAt)
  }

  const { capterraId: _capterraId, ...updateData } = data

  try {
    return await prisma.capterraTool.upsert({
      where: { capterraId },
      create: data as Prisma.CapterraToolCreateInput,
      // Reset isSync so the changed data gets synced to Tool again.
      update: { ...updateData, isSync: 0 }
    })
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Failed to save CapterraTool' })
  }
})
