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

// Upsert a PhCategory keyed by slug.
// Fields left out of the body are not touched on update, so a placeholder row
// (created during product ingestion without categoryId) can be filled in later.
// The parent (parentCategoryId = parent's categoryId) must already be saved.
export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const body = await readBody(event)

  const slug = toOptionalString(body.slug)
  const name = toOptionalString(body.name)

  if (!slug) throw createError({ statusCode: 400, statusMessage: 'Slug is required' })
  if (!name) throw createError({ statusCode: 400, statusMessage: 'Name is required' })

  const categoryId = toOptionalInt(body.categoryId)
  const parentCategoryId = toOptionalInt(body.parentCategoryId)
  if (categoryId !== undefined && parentCategoryId === categoryId) {
    throw createError({ statusCode: 400, statusMessage: 'A category cannot be its own parent' })
  }

  const data: Record<string, any> = {
    slug,
    name,
    categoryId,
    description: toOptionalString(body.description),
    path: toOptionalString(body.path),
    parentCategoryId
  }

  const { slug: _slug, ...updateData } = data

  try {
    return await prisma.phCategory.upsert({
      where: { slug },
      create: data,
      update: updateData
    })
  } catch (err: any) {
    if (err?.code === 'P2002') {
      throw createError({ statusCode: 409, statusMessage: 'categoryId already belongs to another slug' })
    }
    if (err?.code === 'P2003') {
      throw createError({ statusCode: 422, statusMessage: `Parent category ${parentCategoryId} not found, save it first` })
    }
    throw createError({ statusCode: 400, statusMessage: 'Failed to save PhCategory' })
  }
})
