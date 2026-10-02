import type { Prisma } from '@prisma/client'

// Validation of what a tool's owner may send — shared by the edit of a not-yet-published
// tool (PATCH /api/me/tools/[id]) and the paid update request of a published one
// (PATCH /api/me/tools/[id]/update-request), so both accept exactly the same input.
// Website is never accepted (it's what was paid for); flags, status and slug are admin-only.

const PRICING = ['FREE', 'FREEMIUM', 'PAID'] as const
const CONTENT_KEYS = ['shortDesc', 'description', 'whatIs', 'howToUse', 'coreFeatures', 'useCases'] as const

const bad = (message: string) => createError({ statusCode: 400, statusMessage: message, message })
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const list = (v: unknown) =>
  Array.isArray(v) ? v.map(s => text(s, 500)).filter(Boolean).slice(0, 30) : []
const urlOrNull = (v: unknown) => {
  const s = text(v, 2000)
  if (!s) return null
  if (!hostOf(s)) throw bad(`Invalid URL: ${s}`)
  return s
}
// Our own upload (/uploads/…) or an external http(s) image.
const imageOrNull = (v: unknown) => {
  const s = text(v, 2000)
  if (!s) return null
  if (!isImageUrl(s)) throw bad(`Invalid image: ${s}`)
  return s
}

export interface OwnerToolFields {
  name?: string
  logoUrl?: string | null
  images?: string[]
  screenshotUrl?: string | null
  twitterUrl?: string | null
  discordUrl?: string | null
  productHuntUrl?: string | null
  pricingType?: (typeof PRICING)[number]
}

export interface OwnerToolContent {
  shortDesc: string | null
  description: string | null
  whatIs: string | null
  howToUse: string | null
  coreFeatures: string[]
  useCases: string[]
}

export interface OwnerToolInput {
  fields: OwnerToolFields
  // Present only when the request sends them (forms leave untouched ones out).
  categorySlugs?: string[]
  content?: OwnerToolContent
}

export async function parseOwnerToolInput(body: Record<string, unknown>): Promise<OwnerToolInput> {
  const fields: OwnerToolFields = {}
  if ('name' in body) {
    const name = text(body.name, 120)
    if (!name) throw bad('Name is required.')
    fields.name = name
  }
  if ('logoUrl' in body) fields.logoUrl = imageOrNull(body.logoUrl)
  if ('images' in body) Object.assign(fields, toolImagesData(body.images))
  if ('twitterUrl' in body) fields.twitterUrl = urlOrNull(body.twitterUrl)
  if ('discordUrl' in body) fields.discordUrl = urlOrNull(body.discordUrl)
  if ('productHuntUrl' in body) fields.productHuntUrl = urlOrNull(body.productHuntUrl)
  if ('pricingType' in body) {
    if (!PRICING.includes(body.pricingType as (typeof PRICING)[number])) throw bad('Invalid pricing type.')
    fields.pricingType = body.pricingType as (typeof PRICING)[number]
  }

  const input: OwnerToolInput = { fields }
  // Only sent when the owner changed the selection (see categoriesSetData).
  if ('categorySlugs' in body) input.categorySlugs = (await categoriesSetData(body.categorySlugs)).set.map(c => c.slug)
  // The listing only counts when the request carries it — a PATCH of other fields
  // (e.g. just the name) must not blank out the English text.
  if (CONTENT_KEYS.some(k => k in body)) {
    input.content = {
      shortDesc: text(body.shortDesc, 300) || null,
      description: text(body.description, 10000) || null,
      whatIs: text(body.whatIs, 5000) || null,
      howToUse: text(body.howToUse, 5000) || null,
      coreFeatures: list(body.coreFeatures),
      useCases: list(body.useCases)
    }
  }
  return input
}

// The checks "Submit for review" makes, against what the tool WILL look like:
// every English field, at least one category and a logo.
export function assertReadyForReview(state: { content: OwnerToolContent | null | undefined; categoryCount: number; logoUrl: string | null | undefined }) {
  if (!state.content || !contentComplete(state.content)) throw bad('Please fill in every description field before submitting.')
  if (state.categoryCount === 0) throw bad('Please choose a category.')
  if (!state.logoUrl) throw bad('Please upload a logo.')
}

export function toolUpdateData(fields: OwnerToolFields): Prisma.ToolUpdateInput {
  return { ...fields } as Prisma.ToolUpdateInput
}
