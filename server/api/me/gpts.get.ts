// The logged-in user's submitted GPTs (Dashboard → My GPTs), newest first.
export default defineEventHandler(async (event) => {
  const userId = await requireActiveUser(event)
  await ensureGptsForPaidOrders(userId)
  const items = await prisma.gpt.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: { id: true, slug: true, name: true, iconUrl: true, url: true, status: true, fetchStatus: true, rejectionReason: true, createdAt: true, publishedAt: true }
  })
  return { items }
})
