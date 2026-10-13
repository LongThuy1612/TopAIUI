// Moves the favorites a visitor starred before saves needed an account (kept in
// localStorage under "topainew:favorites") into their account, once, after login.
// collectionCount is left alone: the old anonymous star already counted each of them.
const MAX_SLUGS = 500

export default defineEventHandler(async (event) => {
  const userId = await requireActiveUser(event)
  const body = await readBody<{ slugs?: unknown }>(event)
  const slugs = Array.isArray(body?.slugs)
    ? [...new Set(body.slugs.filter((s): s is string => typeof s === 'string' && s.length > 0 && s.length <= 200))].slice(0, MAX_SLUGS)
    : []
  if (!slugs.length) return { imported: 0 }

  const tools = await prisma.tool.findMany({ where: { slug: { in: slugs }, status: 'PUBLISHED', deletedAt: null }, select: { id: true } })
  const { count } = await prisma.toolSave.createMany({
    data: tools.map(tool => ({ userId, toolId: tool.id })),
    skipDuplicates: true
  })
  return { imported: count }
})
