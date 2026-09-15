export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing tool id' })
  }

  const tool = await prisma.tool.findUnique({ where: { id }, include: { categories: true, translations: true } })
  if (!tool) {
    throw createError({ statusCode: 404, statusMessage: 'Tool not found' })
  }

  return tool
})
