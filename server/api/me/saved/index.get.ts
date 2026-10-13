// Dashboard → Saved AIs: the user's saved tools, most recently saved first.
// Tools since unpublished or deleted are left out (their rows stay, and come back with them).
export default defineEventHandler(async (event) => {
  const userId = await requireActiveUser(event)
  const query = getQuery(event)
  const page = Math.max(1, Math.floor(Number(query.page)) || 1)
  const limit = Math.min(48, Math.max(1, Math.floor(Number(query.limit)) || 24))
  const locale = String(query.locale ?? 'en')

  const where = { userId, tool: { status: 'PUBLISHED', deletedAt: null } } as const
  const [rows, total] = await Promise.all([
    prisma.toolSave.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { toolId: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
      select: { tool: { select: TOOL_CARD_SELECT } }
    }),
    prisma.toolSave.count({ where })
  ])

  return {
    items: rows.map(row => toToolCard(row.tool, locale)),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / limit))
  }
})
