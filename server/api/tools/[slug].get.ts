export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const tool = await prisma.tool.findFirst({ where: { slug, status: 'PUBLISHED' }, include: { categories: true } })

  if (!tool) {
    throw createError({ statusCode: 404, statusMessage: `Tool "${slug}" not found` })
  }

  return tool
})
