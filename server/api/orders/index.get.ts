// The logged-in user's promote orders plus their credit balances.
export default defineEventHandler(async (event) => {
  const userId = await requireActiveUser(event)

  const [user, ads, orders, invoices] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { postCredits: true } }),
    // Ad clicks live on each campaign now; this is their total.
    prisma.adCampaign.aggregate({ where: { userId, status: { not: 'REJECTED' } }, _sum: { clicksRemaining: true } }),
    prisma.promoteOrder.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, type: true, payload: true, amount: true, currency: true, status: true, createdAt: true, paidAt: true, refundedCredits: true, refundedAmount: true }
    }),
    // Research Plan charges (first payment, renewals, plan changes).
    prisma.subscriptionInvoice.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, amount: true, currency: true, status: true, plan: true, interval: true, periodStart: true, periodEnd: true, hostedInvoiceUrl: true, invoicePdf: true, paidAt: true, createdAt: true }
    })
  ])
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  return { postCredits: user.postCredits, adClicks: ads._sum.clicksRemaining ?? 0, orders, invoices }
})
