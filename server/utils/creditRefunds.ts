import type { Prisma } from '@prisma/client'

// Refunding unused guest-post credits (admin → user page). Credits are one balance
// (User.postCredits) fed by every guest-post order, so an order can give back at most
//   min(credits it bought − credits already refunded from it, the user's current balance)
// — credits already spent on posts / link inserts are never refunded. The money is the
// order's own price per credit (a bulk discount stays applied); the last credits of an
// order take whatever is left of its amount, so rounding never adds up to more than paid.
//
// It all runs in one transaction that holds the order row (and the user's balance) while
// Stripe refunds: if Stripe fails, the transaction rolls back and nothing changed. Each
// refund carries a key in its metadata (order + credits already refunded before it); a retry
// — after a timeout where Stripe may have refunded anyway — finds that refund instead of
// making a second one, even long after Stripe's own 24 h idempotency window.

const conflict = (message: string) => createError({ statusCode: 409, statusMessage: 'Conflict', message })

type OrderRow = { id: string; amount: number; payload: Prisma.JsonValue; refundedCredits: number; refundedAmount: number }

const boughtCredits = (order: OrderRow) => Math.max(0, Math.floor(Number((order.payload as Record<string, unknown>)?.credits) || 0))

export function refundableOf(order: OrderRow, balance: number) {
  const bought = boughtCredits(order)
  const left = Math.max(0, bought - order.refundedCredits)
  const credits = Math.max(0, Math.min(left, balance))
  if (!credits || !bought) return { credits: 0, amount: 0 }
  const amount = credits === left
    ? order.amount - order.refundedAmount
    : Math.round((order.amount * credits) / bought)
  return { credits, amount: Math.max(0, amount) }
}

// The user's paid guest-post orders with what each could give back right now.
export async function creditOrdersOf(userId: string) {
  const [user, orders] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { postCredits: true } }),
    prisma.promoteOrder.findMany({
      where: { userId, type: 'guest-post', status: { in: ['PAID', 'REFUNDED'] } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, amount: true, currency: true, status: true, payload: true, createdAt: true, paidAt: true, refundedCredits: true, refundedAmount: true }
    })
  ])
  if (!user) throw createError({ statusCode: 404, statusMessage: 'User not found' })
  return {
    postCredits: user.postCredits,
    orders: orders.map(o => ({
      id: o.id,
      amount: o.amount,
      currency: o.currency,
      status: o.status,
      createdAt: o.createdAt,
      paidAt: o.paidAt,
      credits: boughtCredits(o),
      refundedCredits: o.refundedCredits,
      refundedAmount: o.refundedAmount,
      refundable: o.status === 'PAID' ? refundableOf(o, user.postCredits) : { credits: 0, amount: 0 }
    }))
  }
}

async function stripeRefund(order: RefundableOrder, amount: number, key: string) {
  if (order.stripeSessionId.startsWith('fake_')) return // dev FAKE_PAYMENT orders
  if (order.provider === 'paypal') return void await refundPaypalOrder(order, key, amount)
  const stripe = useStripe()
  const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId)
  const paymentIntent = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id
  if (!paymentIntent) throw createError({ statusCode: 502, statusMessage: 'No payment to refund for this order' })
  const earlier = await stripe.refunds.list({ payment_intent: paymentIntent, limit: 100 })
  if (earlier.data.some(r => r.metadata?.refundKey === key && r.status !== 'failed' && r.status !== 'canceled')) return
  await stripe.refunds.create({ payment_intent: paymentIntent, amount, metadata: { refundKey: key, orderId: order.id } }, { idempotencyKey: key })
}

// `expect`: the credits / amount the admin saw and confirmed. If the balance or the order
// changed since (the user spent credits, another admin refunded), nothing happens and the
// admin sees the new figures.
export async function refundUnusedCredits(userId: string, orderId: string, expect: { credits: number; amount: number }) {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "PromoteOrder" WHERE id = ${orderId} AND "userId" = ${userId} FOR UPDATE`
    if (!rows.length) throw createError({ statusCode: 404, statusMessage: 'Order not found' })
    const order = await tx.promoteOrder.findUniqueOrThrow({ where: { id: orderId } })
    if (order.type !== 'guest-post') throw createError({ statusCode: 400, statusMessage: 'Not a guest post order' })
    if (order.status !== 'PAID') throw conflict('This order has nothing left to refund.')
    const user = await tx.user.findUnique({ where: { id: userId }, select: { postCredits: true } })
    const { credits, amount } = refundableOf(order, user?.postCredits ?? 0)
    if (!credits) throw conflict('No unused credits left to refund for this order.')
    if (credits !== expect.credits || amount !== expect.amount) {
      throw conflict('The balance changed meanwhile — please check the new figures and confirm again.')
    }

    // Takes the balance row's lock too: the customer can't spend these credits meanwhile.
    const taken = await tx.user.updateMany({ where: { id: userId, postCredits: { gte: credits } }, data: { postCredits: { decrement: credits } } })
    if (taken.count !== 1) throw conflict('The balance changed meanwhile — please reload.')
    const refundedCredits = order.refundedCredits + credits
    await tx.promoteOrder.update({
      where: { id: orderId },
      data: {
        refundedCredits,
        refundedAmount: order.refundedAmount + amount,
        ...(refundedCredits >= boughtCredits(order) ? { status: 'REFUNDED' } : {})
      }
    })

    try {
      await stripeRefund(order, amount, `guest-credit-refund-${orderId}-${order.refundedCredits}`)
    } catch (err: any) {
      // Throwing rolls the transaction back: credits and order stay as they were.
      if (isError(err)) throw err
      throw createError({ statusCode: 502, statusMessage: 'Stripe refund failed', message: `Refund failed: ${err?.message ?? 'unknown error'}. Nothing was changed; try again (a retry never refunds twice).` })
    }
    return { orderId, credits, amount }
  }, { timeout: 30_000, maxWait: 10_000 })
}
