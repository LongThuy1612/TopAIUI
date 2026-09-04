const allowed = ['name', 'website', 'pricingType', 'isFeatured', 'isVerified', 'isJustLaunched', 'isFreeTool', 'status', 'logoUrl'] as const

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing tool id' })
  }
  const updates = await readBody(event)

  // Whitelist editable fields so an admin-panel bug can't accidentally
  // let arbitrary body fields (e.g. id) overwrite the document.
  const patch: Record<string, any> = {}
  for (const key of allowed) {
    if (key in updates) patch[key] = updates[key]
  }
  if (updates.categorySlug) {
    patch.categories = { set: [{ slug: updates.categorySlug }] }
  }

  try {
    return await prisma.tool.update({ where: { id }, data: patch, include: { categories: true } })
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'Tool not found' })
  }
})
