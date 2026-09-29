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
      // Delayed payment methods fire `completed` while still unpaid; wait for
      // `async_payment_succeeded` in that case.
      if (session.payment_status !== 'paid') break

      const order = await fulfillPromoteOrder(session.id)
      const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
      if (order && customerId) {
        await prisma.user.updateMany({
          where: { id: order.userId, stripeCustomerId: null },
          data: { stripeCustomerId: customerId }
        })
      }
      break
    }
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
