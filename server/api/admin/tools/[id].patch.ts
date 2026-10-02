const allowed = [
  'name', 'website', 'pricingType', 'isFeatured', 'isVerified', 'isJustLaunched', 'isFreeTool',
  'status', 'logoUrl', 'isApproved', 'addedOn', 'region', 'source', 'monthlyRevenue',
  'affiliateUrl', 'couponCode', 'twitterUrl', 'discordUrl', 'productHuntUrl'
] as const

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

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
  // Screenshots (uploaded or URLs) — only when the form actually changed them,
  // so crawled tools keep their original images entries.
  if ('images' in updates) Object.assign(patch, toolImagesData(updates.images))
  // Only sent when the admin changed the selection, so untouched tools keep every category.
  if ('categorySlugs' in updates) patch.categories = await categoriesSetData(updates.categorySlugs)

  try {
    return await prisma.tool.update({ where: { id }, data: patch, include: { categories: true } })
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'Tool not found' })
  }
})
