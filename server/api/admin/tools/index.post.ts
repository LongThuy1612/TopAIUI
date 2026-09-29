const allowed = [
  'name', 'website', 'pricingType', 'isFeatured', 'isVerified', 'isJustLaunched', 'isFreeTool',
  'status', 'logoUrl', 'isApproved', 'addedOn', 'region', 'source', 'monthlyRevenue',
  'affiliateUrl', 'couponCode', 'twitterUrl', 'discordUrl', 'productHuntUrl'
] as const

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)

  const name = String(body.name ?? '').trim()
  const slug = String(body.slug ?? '').trim()
  if (!name) throw createError({ statusCode: 400, statusMessage: 'Name is required' })
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'Slug is required' })

  const data: Record<string, any> = { name, slug }
  for (const key of allowed) {
    if (key in body) data[key] = body[key]
  }
  if (body.categorySlug) {
    data.categories = { connect: [{ slug: body.categorySlug }] }
  }

  try {
    return await prisma.tool.create({ data, include: { categories: true, translations: true } })
  } catch (err: any) {
    if (err?.code === 'P2002') {
      throw createError({ statusCode: 409, statusMessage: 'A tool with this slug already exists' })
    }
    throw createError({ statusCode: 400, statusMessage: 'Failed to create tool' })
  }
})
