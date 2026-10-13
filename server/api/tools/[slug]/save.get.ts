// Whether the logged-in user has saved this tool, with the live save count: the tool
// page itself is cached (HTML up to an hour, its API 5 minutes), so the count it was
// rendered with can be older than the user's own save.
export default defineEventHandler(async (event) => {
  const userId = await requireActiveUser(event)
  setResponseHeader(event, 'Cache-Control', 'no-store') // per user
  const slug = getRouterParam(event, 'slug') ?? ''
  const tool = await prisma.tool.findFirst({
    where: { slug, status: 'PUBLISHED', deletedAt: null },
    select: { collectionCount: true, saves: { where: { userId }, select: { toolId: true }, take: 1 } }
  })
  if (!tool) throw createError({ statusCode: 404, statusMessage: 'Tool not found' })
  return { saved: tool.saves.length > 0, collectionCount: tool.collectionCount }
})
