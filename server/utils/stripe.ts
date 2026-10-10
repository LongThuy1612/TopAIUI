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
// count === 1. Guest-post credits are added to the user's balance; ad clicks
// open or top up the tool's ad campaign (server/utils/ads.ts); a submit-ai order creates the user's PENDING tool (see
// server/utils/userTools.ts); an update-ai order opens the owner's update request
// (server/utils/toolUpdates.ts); a submit-gpt order creates the GPT waiting for review
// (server/utils/gpts.ts), whose page is fetched once the transaction is committed.
export async function fulfillPromoteOrder(sessionId: string) {
  let gptToFetch: string | null = null
  const result = await prisma.$transaction(async (tx) => {
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
      const { toolId, campaignId } = await applyAdOrder(tx, order)
      return tx.promoteOrder.update({ where: { id: order.id }, data: { toolId, campaignId } })
    } else if (order.type === 'submit-ai') {
      const toolId = await createSubmittedTool(tx, order.userId, payload)
      return tx.promoteOrder.update({ where: { id: order.id }, data: { toolId } })
    } else if (order.type === 'update-ai') {
      const { toolId } = await createUpdateRequest(tx, order)
      return tx.promoteOrder.update({ where: { id: order.id }, data: { toolId } })
    } else if (order.type === 'submit-gpt') {
      gptToFetch = await createGptForOrder(tx, order)
    }
    return order
  })
  // Outside the transaction: reading chatgpt.com can take seconds. Not awaited — the
  // webhook answers Stripe right away; a failed fetch shows in the admin queue.
  if (gptToFetch) void fetchGptInfo(gptToFetch).catch(err => console.error('[gpts] fetch failed', gptToFetch, err))
  return result
}
