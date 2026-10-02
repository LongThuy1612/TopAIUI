export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing tool id' })
  }

  const tool = await prisma.tool.findUnique({ where: { id }, include: { categories: true, translations: true } })
  if (!tool) {
    throw createError({ statusCode: 404, statusMessage: 'Tool not found' })
  }

  // User-submitted tools: who sent it and whether our team writes the listing.
  if (!tool.ownerId) return tool
  const [owner, submitMode, duplicateOf, updateRequest] = await Promise.all([
    prisma.user.findUnique({ where: { id: tool.ownerId }, select: { id: true, email: true, name: true } }),
    submitModeOf(tool.id),
    tool.website ? findDuplicateTool(tool.website, tool.id) : null,
    // An open paid update (the owner may still be filling it in, or it waits for review).
    findOpenUpdate(tool.id)
  ])
  return { ...tool, owner, submitMode, duplicateOf, updateRequest }
})
