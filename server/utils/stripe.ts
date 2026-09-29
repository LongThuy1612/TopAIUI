import Stripe from 'stripe'

let client: Stripe | null = null

export function useStripe(): Stripe {
  if (client) return client
  const { stripeSecretKey } = useRuntimeConfig()
  if (!stripeSecretKey) {
    throw createError({ statusCode: 500, statusMessage: 'Stripe is not configured' })
  }
  client = new Stripe(stripeSecretKey)
  return client
}

// Marks the order PAID and applies its effect — exactly once. Safe to call for
// every webhook delivery: only the caller that flips PENDING → PAID gets
// count === 1. Guest-post credits and ad clicks are added to the user's
// balance; submit / update / GPT orders are left PAID for an admin to process.
export async function fulfillPromoteOrder(sessionId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.promoteOrder.findUnique({ where: { stripeSessionId: sessionId } })
    if (!order) return null

    const { count } = await tx.promoteOrder.updateMany({
      where: { id: order.id, status: 'PENDING' },
      data: { status: 'PAID', paidAt: new Date() }
    })
    if (count !== 1) return order

    const payload = order.payload as Record<string, unknown>
    if (order.type === 'guest-post') {
      await tx.user.update({
        where: { id: order.userId },
        data: { postCredits: { increment: Number(payload.credits) } }
      })
    } else if (order.type === 'advertise') {
      await tx.user.update({
        where: { id: order.userId },
        data: { adCredits: { increment: Number(payload.clicks) } }
      })
    }
    return order
  })
}
