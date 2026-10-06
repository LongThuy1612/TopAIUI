export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const body = await readBody<{ saved?: boolean }>(event)
  const saved = Boolean(body?.saved)

  // One atomic UPDATE instead of read-then-write, so concurrent clicks can't
  // overwrite each other's count. Unsaving never takes it below 0.
  await prisma.tool.updateMany({
    where: saved ? { slug } : { slug, collectionCount: { gt: 0 } },
    data: { collectionCount: saved ? { increment: 1 } : { decrement: 1 } }
  })

  const tool = await prisma.tool.findUnique({ where: { slug }, select: { collectionCount: true } })
  if (!tool) {
    throw createError({ statusCode: 404, statusMessage: `Tool "${slug}" not found` })
  }

  return { collectionCount: tool.collectionCount }
})
