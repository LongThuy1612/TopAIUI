// Tools owned by the logged-in user (Tool.ownerId) — backs "My AIs" and the
// dashboard counters. Admins use /api/admin/tools for the full catalogue.
export default defineEventHandler(async (event) => {
  // requireRole also rejects banned / deleted accounts whose token is still valid.
  const { id: userId } = await requireRole(event, ['USER', 'MANAGER', 'ADMIN'])

  const items = await prisma.tool.findMany({
    where: { ownerId: userId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { categories: true }
  })
  return { items }
})
