export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const body = await readBody<{ saved?: boolean }>(event)
  const saved = Boolean(body?.saved)

  const tool = await prisma.tool.findUnique({ where: { slug }, select: { id: true, collectionCount: true } })
  if (!tool) {
    throw createError({ statusCode: 404, statusMessage: `Tool "${slug}" not found` })
  }

  const collectionCount = saved ? tool.collectionCount + 1 : Math.max(0, tool.collectionCount - 1)

  const updated = await prisma.tool.update({
    where: { id: tool.id },
    data: { collectionCount },
    select: { collectionCount: true }
  })

  return { collectionCount: updated.collectionCount }
})
