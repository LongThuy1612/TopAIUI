import type { H3Event } from 'h3'
import { randomUUID } from 'node:crypto'

// PayPal Checkout (Orders v2 REST API) for promote orders, beside Stripe.
//   /api/promote/checkout { provider: 'paypal' } → PayPal order (intent CAPTURE) + our
//     PENDING PromoteOrder whose stripeSessionId holds the PayPal order id
//   buyer approves on PayPal → back on the promote page with ?paypal=1&token=<order id>
//   the page polls /api/promote/session/<order id> → syncPaypalOrder captures the money
//     and fulfils the order
//   /api/paypal/webhook does the same when the buyer never comes back, and finishes
//     captures PayPal held for review (PENDING → COMPLETED).
// Unlike Stripe, nothing is charged until we capture: an approved order that is never
// captured costs the buyer nothing.

type PaypalMoney = { currency_code: string; value: string }
type PaypalCapture = { id: string; status: string; amount?: PaypalMoney } // status: COMPLETED | PENDING | DECLINED | FAILED | REFUNDED | PARTIALLY_REFUNDED
type PaypalRefund = { id: string; status: string; custom_id?: string }
type PaypalOrder = {
  id: string
  status: string // CREATED | SAVED | APPROVED | VOIDED | COMPLETED | PAYER_ACTION_REQUIRED
  links?: { rel: string; href: string }[]
  purchase_units?: { payments?: { captures?: PaypalCapture[]; refunds?: PaypalRefund[] } }[]
}

let token: { value: string; expiresAt: number } | null = null

const apiBase = () => useRuntimeConfig().paypalMode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'

export function isPaypalConfigured() {
  const config = useRuntimeConfig()
  return !!(config.public.paypalClientId && config.paypalClientSecret)
}

// Whether new payments (promote orders, Research Plans) may go through Stripe: PayPal is
// the main checkout; Stripe only when switched on (NUXT_PUBLIC_STRIPE_ENABLED), or when
// PayPal has no keys (local dev).
export function isStripeCheckoutEnabled() {
  return !!useRuntimeConfig().public.stripeEnabled || !isPaypalConfigured()
}

async function accessToken() {
  if (token && token.expiresAt > Date.now() + 60_000) return token.value
  const { paypalClientSecret, public: { paypalClientId } } = useRuntimeConfig()
  if (!paypalClientId || !paypalClientSecret) {
    throw createError({ statusCode: 500, statusMessage: 'PayPal is not configured' })
  }
  const res = await $fetch<{ access_token: string; expires_in: number }>(`${apiBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${paypalClientId}:${paypalClientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  })
  token = { value: res.access_token, expiresAt: Date.now() + res.expires_in * 1000 }
  return token.value
}

// `requestId` (PayPal-Request-Id) makes a retried POST return the first answer instead
// of doing the work twice.
export async function paypalApi<T>(path: string, opts: { method?: 'GET' | 'POST'; body?: Record<string, unknown> | string; requestId?: string } = {}): Promise<T> {
  const method = opts.method ?? 'GET'
  const call = async () => $fetch<T>(`${apiBase()}${path}`, {
    method,
    // A string goes as is (the webhook check must send the event exactly as received).
    body: method === 'POST' ? (opts.body ?? {}) as Record<string, unknown> | string : undefined,
    headers: {
      'Authorization': `Bearer ${await accessToken()}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...(opts.requestId ? { 'PayPal-Request-Id': opts.requestId } : {})
    }
  })
  try {
    return await call()
  } catch (err) {
    // The cached token was revoked or expired early (keys rotated, live <-> sandbox): once
    // more with a fresh one. Safe for POSTs too: a 401 means PayPal did nothing.
    if ((err as { statusCode?: number })?.statusCode !== 401) throw err
    token = null
    return call()
  }
}

// PayPal's error name (ORDER_ALREADY_CAPTURED, CAPTURE_FULLY_REFUNDED…) of a failed call.
export const paypalIssue = (err: unknown) => (err as { data?: { details?: { issue?: string }[] } })?.data?.details?.[0]?.issue

const getOrder = (orderId: string) => paypalApi<PaypalOrder>(`/v2/checkout/orders/${encodeURIComponent(orderId)}`)

const usd = (cents: number): PaypalMoney => ({ currency_code: 'USD', value: (cents / 100).toFixed(2) })

// → { id, approveUrl }: the buyer is sent to approveUrl to pay.
export async function createPaypalOrder(o: { amountCents: number; label: string; userId: string; returnUrl: string; cancelUrl: string }) {
  const order = await paypalApi<PaypalOrder>('/v2/checkout/orders', {
    method: 'POST',
    requestId: randomUUID(),
    body: {
      intent: 'CAPTURE',
      purchase_units: [{ description: o.label.slice(0, 127), custom_id: o.userId, amount: usd(o.amountCents) }],
      payment_source: {
        paypal: {
          experience_context: {
            return_url: o.returnUrl,
            cancel_url: o.cancelUrl,
            user_action: 'PAY_NOW',
            shipping_preference: 'NO_SHIPPING'
          }
        }
      }
    }
  })
  const approveUrl = order.links?.find(l => l.rel === 'payer-action' || l.rel === 'approve')?.href
  if (!approveUrl) throw createError({ statusCode: 502, statusMessage: 'PayPal did not return a payment link' })
  return { id: order.id, approveUrl }
}

// Brings a PayPal promote order up to date: captures it once the buyer approved it, then
// fulfils ours once the money is really in. Safe to call from the webhook and the return
// page at the same time — the capture carries a request id and fulfillPromoteOrder only
// runs once. Returns our order row (null if there is none).
export async function syncPaypalOrder(paypalOrderId: string) {
  const row = await prisma.promoteOrder.findUnique({ where: { stripeSessionId: paypalOrderId } })
  if (!row || row.provider !== 'paypal' || row.status !== 'PENDING') return row

  let order = await getOrder(paypalOrderId)
  if (order.status === 'APPROVED') {
    try {
      order = await paypalApi<PaypalOrder>(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
        method: 'POST',
        requestId: `capture-${paypalOrderId}`
      })
    } catch (err) {
      // The card was declined at capture: nothing is paid. Not an error (the webhook must not
      // retry for ever); the buyer pays again with a new order.
      if (paypalIssue(err) === 'INSTRUMENT_DECLINED') {
        await prisma.promoteOrder.updateMany({ where: { id: row.id, status: 'PENDING' }, data: { status: 'EXPIRED' } })
        return prisma.promoteOrder.findUnique({ where: { id: row.id } })
      }
      // Captured meanwhile by the other caller (webhook ↔ return page).
      if (paypalIssue(err) !== 'ORDER_ALREADY_CAPTURED') throw err
      order = await getOrder(paypalOrderId)
    }
  }

  const capture = order.purchase_units?.[0]?.payments?.captures?.[0]
  if (!capture) return row // not approved yet
  await prisma.promoteOrder.updateMany({ where: { id: row.id, paypalCaptureId: null }, data: { paypalCaptureId: capture.id } })

  if (capture.status === 'COMPLETED') {
    // The order's price is ours, never the buyer's: anything else needs a manual look.
    if (capture.amount?.currency_code !== 'USD' || Math.round(Number(capture.amount.value) * 100) !== row.amount) {
      console.error('[paypal] captured amount differs from the order', row.id, capture.amount)
      return row
    }
    return fulfillPromoteOrder(paypalOrderId)
  }
  if (capture.status === 'DECLINED' || capture.status === 'FAILED') {
    await prisma.promoteOrder.updateMany({ where: { id: row.id, status: 'PENDING' }, data: { status: 'EXPIRED' } })
  }
  // PENDING: PayPal is reviewing the payment, the PAYMENT.CAPTURE.COMPLETED webhook finishes it.
  return prisma.promoteOrder.findUnique({ where: { id: row.id } })
}

// Nightly (server/tasks/research/paypal-cleanup.ts): PayPal orders never paid — the buyer
// left PayPal, or the card was declined — turn EXPIRED, like Stripe's expired sessions.
// After a day, like a Stripe session (and findPendingSubmission stops counting it then);
// an approval arriving later is never captured (syncPaypalOrder skips non-PENDING orders),
// so nobody pays for an order we gave up. One with a capture under review
// (paypalCaptureId set) waits for PayPal's answer instead.
export async function expireAbandonedPaypalOrders() {
  const { count } = await prisma.promoteOrder.updateMany({
    where: { provider: 'paypal', status: 'PENDING', paypalCaptureId: null, createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    data: { status: 'EXPIRED' }
  })
  return count
}

// The order fields a refund needs, whichever provider took the payment.
export const refundableOrderSelect = { id: true, stripeSessionId: true, provider: true, paypalCaptureId: true } as const
export type RefundableOrder = { id: string; stripeSessionId: string; provider: string; paypalCaptureId: string | null }

// Refunds a PayPal promote order: the whole payment, or `amountCents` of it. `key` makes a
// retry find the refund it already made instead of a second one.
export async function refundPaypalOrder(order: { stripeSessionId: string; paypalCaptureId: string | null }, key: string, amountCents?: number) {
  const paypalOrder = await getOrder(order.stripeSessionId)
  const payments = paypalOrder.purchase_units?.[0]?.payments
  const earlier = payments?.refunds?.find(r => r.custom_id === key && r.status !== 'FAILED' && r.status !== 'CANCELLED')
  if (earlier) return earlier.id
  const captureId = order.paypalCaptureId ?? payments?.captures?.[0]?.id
  if (!captureId) throw createError({ statusCode: 502, statusMessage: 'No payment to refund for this order' })

  try {
    const refund = await paypalApi<PaypalRefund>(`/v2/payments/captures/${encodeURIComponent(captureId)}/refund`, {
      method: 'POST',
      requestId: key,
      body: { custom_id: key, ...(amountCents == null ? {} : { amount: usd(amountCents) }) }
    })
    return refund.id
  } catch (err) {
    // A full refund of a payment already fully refunded (by hand on PayPal, or a retry
    // after PayPal forgot the request id) is done. A partial one is never assumed done.
    if (amountCents == null && paypalIssue(err) === 'CAPTURE_FULLY_REFUNDED') return `already_refunded_${captureId}`
    throw err
  }
}

// Checks a webhook delivery with PayPal. The event goes back exactly as received (raw
// body): re-serialized JSON can fail the check.
export async function verifyPaypalWebhook(event: H3Event, rawBody: string) {
  const { paypalWebhookId } = useRuntimeConfig()
  const header = (name: string) => getHeader(event, name)
  const fields = {
    auth_algo: header('paypal-auth-algo'),
    cert_url: header('paypal-cert-url'),
    transmission_id: header('paypal-transmission-id'),
    transmission_sig: header('paypal-transmission-sig'),
    transmission_time: header('paypal-transmission-time'),
    webhook_id: paypalWebhookId
  }
  if (Object.values(fields).some(v => !v)) return false
  const body = `${JSON.stringify(fields).slice(0, -1)},"webhook_event":${rawBody}}`
  const res = await paypalApi<{ verification_status: string }>('/v1/notifications/verify-webhook-signature', { method: 'POST', body })
  return res.verification_status === 'SUCCESS'
}
