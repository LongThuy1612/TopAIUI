// PayPal → us (server/utils/paypal.ts). Verified with PayPal against the raw body, so
// this route must never go through readBody() (which would re-serialize the JSON).
// Promote orders (server/utils/paypal.ts): CHECKOUT.ORDER.APPROVED, PAYMENT.CAPTURE.COMPLETED,
// PAYMENT.CAPTURE.DENIED, PAYMENT.CAPTURE.DECLINED. Research Plans
// (server/utils/paypalSubscriptions.ts): BILLING.SUBSCRIPTION.ACTIVATED / UPDATED /
// RE-ACTIVATED / SUSPENDED / CANCELLED / EXPIRED / PAYMENT.FAILED, PAYMENT.SALE.COMPLETED.
import type { PaypalSale } from '../../utils/paypalSubscriptions'

type PaypalEvent = {
  event_type: string
  resource: { id?: string; supplementary_data?: { related_ids?: { order_id?: string } } } & Partial<PaypalSale>
}

export default defineEventHandler(async (event) => {
  const rawBody = await readRawBody(event, 'utf8')
  if (!rawBody || !useRuntimeConfig().paypalWebhookId) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid webhook request' })
  }
  if (!await verifyPaypalWebhook(event, rawBody)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid signature' })
  }

  const paypalEvent = JSON.parse(rawBody) as PaypalEvent
  const { event_type: type, resource } = paypalEvent

  // Research Plan subscriptions. Only ours are mirrored (a row exists, or the plan is one of
  // our Research Plans); errors answer 500 so PayPal delivers the event again.
  if (type === 'PAYMENT.SALE.COMPLETED') {
    if (resource.id && resource.billing_agreement_id) await recordPaypalPayment(resource as PaypalSale)
    return { received: true }
  }
  if (type.startsWith('BILLING.SUBSCRIPTION.')) {
    if (resource.id) await syncPaypalSubscription(resource.id)
    return { received: true }
  }

  let orderId: string | undefined
  switch (type) {
    // The buyer approved but never came back to the site: capture here.
    case 'CHECKOUT.ORDER.APPROVED':
      orderId = resource.id
      break
    case 'PAYMENT.CAPTURE.COMPLETED':
    case 'PAYMENT.CAPTURE.DENIED':
    case 'PAYMENT.CAPTURE.DECLINED':
      orderId = resource.supplementary_data?.related_ids?.order_id
      break
  }
  // An error answers 500, so PayPal delivers the event again later.
  if (orderId) await syncPaypalOrder(orderId)

  return { received: true }
})
