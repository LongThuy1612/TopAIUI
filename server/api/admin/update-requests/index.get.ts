// Paid updates of published tools waiting for an admin (default: SUBMITTED).
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const status = String(getQuery(event).status ?? 'SUBMITTED')
  const items = await prisma.toolUpdateRequest.findMany({
    where: { status },
    orderBy: { submittedAt: 'asc' },
    take: 100,
    select: {
      id: true, status: true, submittedAt: true, createdAt: true,
      tool: { select: { id: true, name: true, slug: true, logoUrl: true } },
      user: { select: { email: true } }
    }
  })
  return { items }
})
