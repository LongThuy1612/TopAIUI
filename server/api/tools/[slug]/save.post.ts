// Save / unsave a tool for the logged-in user (the star on a tool page). collectionCount
// moves only when a ToolSave row is really added or removed, in the same transaction —
// repeating a request, or saving twice from two tabs, can't inflate it.
export default defineEventHandler(async (event) => {
  const userId = await requireActiveUser(event)
  const slug = getRouterParam(event, 'slug') ?? ''
  const body = await readBody<{ saved?: unknown }>(event)
  const saved = body?.saved === true

  const tool = await prisma.tool.findFirst({ where: { slug, status: 'PUBLISHED', deletedAt: null }, select: { id: true } })
  if (!tool) throw createError({ statusCode: 404, statusMessage: 'Tool not found' })

  const collectionCount = await prisma.$transaction(async (tx) => {
    // Raw UPDATEs: through Prisma they would also bump Tool.updatedAt (@updatedAt), and a
    // save is not an edit of the tool (updatedAt is the sitemap's lastmod).
    if (saved) {
      const { count } = await tx.toolSave.createMany({ data: [{ userId, toolId: tool.id }], skipDuplicates: true })
      if (count) await tx.$executeRaw`UPDATE "Tool" SET "collectionCount" = "collectionCount" + 1 WHERE "id" = ${tool.id}`
    } else {
      const { count } = await tx.toolSave.deleteMany({ where: { userId, toolId: tool.id } })
      // Never below 0 (counts from before saves were per account may not match the rows).
      if (count) await tx.$executeRaw`UPDATE "Tool" SET "collectionCount" = GREATEST("collectionCount" - 1, 0) WHERE "id" = ${tool.id}`
    }
    return (await tx.tool.findUniqueOrThrow({ where: { id: tool.id }, select: { collectionCount: true } })).collectionCount
  })

  return { saved, collectionCount }
})
