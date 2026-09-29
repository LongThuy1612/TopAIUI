// The logged-in user's promote orders plus their credit balances.
export default defineEventHandler(async (event) => {
  const userId = requireUser(event)

  const [user, orders] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { postCredits: true, adCredits: true } }),
    prisma.promoteOrder.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, type: true, payload: true, amount: true, currency: true, status: true, createdAt: true, paidAt: true }
    })
  ])
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  return { postCredits: user.postCredits, adClicks: user.adCredits, orders }
})
