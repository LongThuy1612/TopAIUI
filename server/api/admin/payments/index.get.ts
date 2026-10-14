import type { Prisma } from '@prisma/client'

// Admin → Orders: every customer's payments.
//   ?tab=orders  promote orders (Submit AI, Advertise, credits, Update AI, Submit GPT)
//                ?status= PAID (default) | PENDING | EXPIRED | REFUNDED | all, ?type=
//   ?tab=plans   Research Plan subscriptions with their charges
//                ?status= live (default) | pending (not paid yet) | ended | all
// ?q= customer email, ?page= (50 a page). Totals are over every customer, all time.
const ORDER_STATUSES = ['PAID', 'PENDING', 'EXPIRED', 'REFUNDED']
const ORDER_TYPES = ['submit-ai', 'advertise', 'guest-post', 'update-ai', 'submit-gpt']
const LIMIT = 50

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const query = getQuery(event)
  const page = Math.max(1, Math.floor(Number(query.page)) || 1)
  const q = String(query.q ?? '').trim()
  const user = q ? { email: { contains: q, mode: 'insensitive' as const } } : undefined

  const [paidOrders, paidInvoices, livePlans] = await Promise.all([
    prisma.promoteOrder.aggregate({ where: { status: { in: ['PAID', 'REFUNDED'] } }, _count: { _all: true }, _sum: { amount: true, refundedAmount: true } }),
    prisma.subscriptionInvoice.aggregate({ where: { status: { in: ['paid', 'void'] }, paidAt: { not: null } }, _count: { _all: true }, _sum: { amount: true, refundedAmount: true } }),
    prisma.subscription.count({ where: { status: { in: ACCESS_STATUSES } } })
  ])
  const totals = {
    orders: { count: paidOrders._count._all, amount: (paidOrders._sum.amount ?? 0) - (paidOrders._sum.refundedAmount ?? 0) },
    plans: { count: paidInvoices._count._all, amount: (paidInvoices._sum.amount ?? 0) - (paidInvoices._sum.refundedAmount ?? 0), live: livePlans }
  }

  if (query.tab === 'plans') {
    const status = String(query.status ?? 'live')
    const where: Prisma.SubscriptionWhereInput = { user }
    if (status === 'live') where.status = { in: ACCESS_STATUSES }
    else if (status === 'ended') where.status = { notIn: [...ACCESS_STATUSES, 'incomplete', 'incomplete_expired'] }
    else if (status === 'pending') where.status = 'incomplete' // sent to PayPal / Stripe, not paid yet
    const [items, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * LIMIT,
        take: LIMIT,
        select: {
          id: true, plan: true, interval: true, status: true, provider: true, providerStatus: true,
          stripeSubscriptionId: true, currentPeriodStart: true, currentPeriodEnd: true,
          cancelAtPeriodEnd: true, createdAt: true,
          user: { select: { id: true, email: true } },
          invoices: {
            orderBy: { createdAt: 'desc' },
            take: 24,
            select: { id: true, amount: true, currency: true, status: true, paidAt: true, createdAt: true, refundedAmount: true, refundDue: true, stripeInvoiceId: true }
          }
        }
      }),
      prisma.subscription.count({ where })
    ])
    return { tab: 'plans', items, total, page, pageCount: Math.max(1, Math.ceil(total / LIMIT)), totals }
  }

  const status = String(query.status ?? 'PAID')
  const where: Prisma.PromoteOrderWhereInput = { user }
  if (ORDER_STATUSES.includes(status)) where.status = status
  if (ORDER_TYPES.includes(String(query.type))) where.type = String(query.type)
  const [items, total] = await Promise.all([
    prisma.promoteOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * LIMIT,
      take: LIMIT,
      select: {
        id: true, type: true, payload: true, amount: true, currency: true, status: true, provider: true,
        stripeSessionId: true, paypalCaptureId: true, createdAt: true, paidAt: true,
        refundedCredits: true, refundedAmount: true,
        user: { select: { id: true, email: true } }
      }
    }),
    prisma.promoteOrder.count({ where })
  ])
  return { tab: 'orders', items, total, page, pageCount: Math.max(1, Math.ceil(total / LIMIT)), totals }
})
