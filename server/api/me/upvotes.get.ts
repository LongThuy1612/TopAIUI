// GET /api/me/upvotes?slugs=a,b,c → { slugs: [...] }: which of these tools the signed-in
// user has upvoted (the lists are cached for everyone, so each viewer's ▲ state is
// fetched separately). At most 100 slugs a call.
export default defineEventHandler(async (event) => {
  const userId = await requireActiveUser(event)
  const slugs = String(getQuery(event).slugs ?? '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 100)
  if (!slugs.length) return { slugs: [] }
  const rows = await prisma.toolUpvote.findMany({
    where: { userId, tool: { slug: { in: slugs } } },
    select: { tool: { select: { slug: true } } }
  })
  return { slugs: rows.map(r => r.tool.slug) }
})
