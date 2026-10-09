import type Stripe from 'stripe'

// Stripe → us. Signature-verified against the raw body, so this route must
// never go through readBody() (which would re-serialize the JSON).
export default defineEventHandler(async (event) => {
  const { stripeWebhookSecret } = useRuntimeConfig()
  const signature = getHeader(event, 'stripe-signature')
  const rawBody = await readRawBody(event, false)
  if (!stripeWebhookSecret || !signature || !rawBody) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid webhook request' })
  }

  const stripe = useStripe()
  let stripeEvent: Stripe.Event
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, stripeWebhookSecret)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid signature' })
  }

  switch (stripeEvent.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const session = stripeEvent.data.object
      // Research Plan subscription (not a promote order): mirror the subscription.
      if (isResearchCheckout(session)) {
        const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
        if (subId) await syncStripeSubscriptionById(subId)
        break
      }
      // Delayed payment methods fire `completed` while still unpaid; wait for
      // `async_payment_succeeded` in that case.
      if (session.payment_status !== 'paid') break

      const order = await fulfillPromoteOrder(session.id)
      if (!order) {
        // Paid but no matching PromoteOrder row — needs a manual look.
        console.error('[stripe webhook] paid session without order', session.id, session.metadata)
        break
      }
      const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
      if (order && customerId) {
        await prisma.user.updateMany({
          where: { id: order.userId, stripeCustomerId: null },
          data: { stripeCustomerId: customerId }
        })
      }
      break
    }
    // Research Plan subscriptions (server/utils/research.ts): every change, renewal,
    // cancellation and failed payment is mirrored from Stripe.
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      // Mirrors Stripe's current state, not the event's: events can arrive out of order.
      await syncStripeSubscriptionById(stripeEvent.data.object.id, stripeEvent.data.object)
      break
    // Renewal of a banned user's plan: cancelled before it is charged.
    case 'invoice.created':
      await stopRenewalIfBanned(stripeEvent.data.object)
      break
    case 'invoice.paid':
    case 'invoice.payment_failed':
      await recordStripeInvoice(stripeEvent.data.object)
      break
    case 'checkout.session.expired':
    case 'checkout.session.async_payment_failed': {
      await prisma.promoteOrder.updateMany({
        where: { stripeSessionId: stripeEvent.data.object.id, status: 'PENDING' },
        data: { status: 'EXPIRED' }
      })
      break
    }
  }

  return { received: true }
})
