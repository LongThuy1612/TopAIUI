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

function toOptionalDate(value: unknown): Date | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? undefined : date
}

function toOptionalJson(value: unknown): unknown {
  return value === undefined ? undefined : value
}

// Upsert a ToolifyCategory keyed by handle.
// The parent (parentCategoryId = parent's categoryId) must already be saved.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)

  const categoryId = toOptionalInt(body.categoryId)
  const handle = toOptionalString(body.handle)
  const name = toOptionalString(body.name)

  if (categoryId === undefined) throw createError({ statusCode: 400, statusMessage: 'categoryId is required' })
  if (!handle) throw createError({ statusCode: 400, statusMessage: 'handle is required' })
  if (!name) throw createError({ statusCode: 400, statusMessage: 'Name is required' })

  const parentCategoryId = toOptionalInt(body.parentCategoryId)
  if (parentCategoryId === categoryId) {
    throw createError({ statusCode: 400, statusMessage: 'A category cannot be its own parent' })
  }

  const data: Record<string, any> = {
    categoryId,
    handle,
    name,
    nameLocales: toOptionalJson(body.nameLocales),
    description: toOptionalString(body.description),
    type: toOptionalInt(body.type),
    order: toOptionalInt(body.order),
    toolCount: toOptionalInt(body.toolCount),
    topToolCount: toOptionalInt(body.topToolCount),
    topVisitedCount: toOptionalInt(body.topVisitedCount),
    toolifyCreatedAt: toOptionalDate(body.toolifyCreatedAt),
    toolifyUpdatedAt: toOptionalDate(body.toolifyUpdatedAt),
    sourceUrl: toOptionalString(body.sourceUrl),
    scrapedAt: toOptionalDate(body.scrapedAt) ?? new Date(),
    parentCategoryId: parentCategoryId ?? null
  }

  try {
    return await prisma.toolifyCategory.upsert({
      where: { handle },
      create: data,
      update: data
    })
  } catch (err: any) {
    if (err?.code === 'P2002') {
      throw createError({ statusCode: 409, statusMessage: 'categoryId already belongs to another handle' })
    }
    if (err?.code === 'P2003') {
      throw createError({ statusCode: 422, statusMessage: `Parent category ${parentCategoryId} not found, save it first` })
    }
    throw createError({ statusCode: 400, statusMessage: 'Failed to save ToolifyCategory' })
  }
})
