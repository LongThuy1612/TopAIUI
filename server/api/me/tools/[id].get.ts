// One of the logged-in user's own tools, for the "My AIs" edit page —
// any status, unlike the public /api/tools/[slug] which only serves PUBLISHED.
export default defineEventHandler(async (event) => {
  const { id: userId } = await requireRole(event, ['USER', 'MANAGER', 'ADMIN'])
  const id = getRouterParam(event, 'id')

  const tool = await prisma.tool.findFirst({
    where: { id, ownerId: userId, deletedAt: null },
    include: {
      categories: { select: { slug: true, name: true } },
      translations: { where: { locale: USER_CONTENT_LOCALE } }
    }
  })
  if (!tool) throw createError({ statusCode: 404, statusMessage: 'Tool not found' })

  const [mode, updateRequest] = await Promise.all([
    submitModeOf(tool.id),
    // The latest paid update of a published tool (open, or how the last one ended).
    prisma.toolUpdateRequest.findFirst({
      where: { toolId: tool.id, userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true, changes: true, rejectionReason: true, submittedAt: true, reviewedAt: true }
    })
  ])
  return { ...tool, submitMode: mode, canEdit: ownerCanEdit(tool, mode), updateRequest }
})
