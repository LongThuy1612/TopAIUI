import type { Prisma } from '@prisma/client'
import { isError } from 'h3'

// Paid "Update AI" requests for published tools (model ToolUpdateRequest).
//
//   order paid        → request DRAFT (the owner fills in the new details; live listing untouched)
//   owner submits     → SUBMITTED (editing again moves it back to DRAFT)
//   admin applies     → APPLIED: changes written to the tool, translations re-queued
//   admin rejects     → REJECTED + reason; the order is refunded through Stripe (→ REFUNDED)
// Only the tool's owner can buy one, and only one can be open per tool at a time.

export const OPEN_UPDATE_STATUSES = ['DRAFT', 'SUBMITTED'] as const

export interface UpdateChanges {
  fields: OwnerToolFields
  categorySlugs?: string[]
  content?: OwnerToolContent
}

export function findOpenUpdate(toolId: string) {
  return prisma.toolUpdateRequest.findFirst({
    where: { toolId, status: { in: [...OPEN_UPDATE_STATUSES] } },
    orderBy: { createdAt: 'desc' }
  })
}

// Merge a newly saved form into what the request already holds — the form leaves out
// what it didn't change (categories, screenshots), which must keep the earlier choice.
export function mergeChanges(prev: UpdateChanges | null | undefined, next: OwnerToolInput): UpdateChanges {
  return {
    fields: { ...(prev?.fields ?? {}), ...next.fields },
    categorySlugs: next.categorySlugs ?? prev?.categorySlugs,
    content: next.content ?? prev?.content
  }
}

// Called from fulfillPromoteOrder (inside its transaction) for a paid update-ai order.
export async function createUpdateRequest(tx: Prisma.TransactionClient, order: { id: string; userId: string; payload: unknown }) {
  const toolId = String((order.payload as Record<string, unknown>)?.toolId ?? '')
  const request = await tx.toolUpdateRequest.create({
    data: { toolId, userId: order.userId, orderId: order.id, status: 'DRAFT' },
    select: { id: true }
  })
  return { toolId, requestId: request.id }
}

const conflict = (message: string) => createError({ statusCode: 409, statusMessage: message, message })

// Writes a SUBMITTED request's changes to the live tool. Safe against double clicks /
// two admins: only the caller that flips SUBMITTED → APPLIED goes on to write.
export async function applyUpdateRequest(requestId: string) {
  if (!(await prisma.toolUpdateRequest.findUnique({ where: { id: requestId }, select: { id: true } }))) {
    throw createError({ statusCode: 404, statusMessage: 'Update request not found' })
  }

  return prisma.$transaction(async (tx) => {
    const { count } = await tx.toolUpdateRequest.updateMany({
      where: { id: requestId, status: 'SUBMITTED' },
      data: { status: 'APPLIED', reviewedAt: new Date() }
    })
    if (count !== 1) throw conflict('This update request is not waiting for review.')
    // Read the changes only now, with the row locked by the claim above: the owner may have
    // edited and resubmitted between the admin opening the page and pressing Apply.
    const request = (await tx.toolUpdateRequest.findUnique({ where: { id: requestId } }))!
    const changes = (request.changes ?? { fields: {} }) as unknown as UpdateChanges
    // Categories may have been deleted since the owner picked them.
    const categories = changes.categorySlugs ? await categoriesSetData(changes.categorySlugs) : undefined

    await tx.tool.update({
      where: { id: request.toolId },
      data: {
        ...toolUpdateData(changes.fields ?? {}),
        ...(categories ? { categories } : {}),
        // The English text (maybe) changed: translate it again into every locale.
        ...QUEUE_AI
      }
    })
    if (changes.content) {
      await tx.toolTranslation.upsert({
        where: { toolId_locale: { toolId: request.toolId, locale: USER_CONTENT_LOCALE } },
        update: { ...changes.content, isManualOverride: true },
        create: { toolId: request.toolId, locale: USER_CONTENT_LOCALE, ...changes.content, isManualOverride: true }
      })
    }
    return { id: requestId, status: 'APPLIED' as const }
  })
}

// Refunds the order behind a request. The idempotency key makes a retry (double click,
// a failure after Stripe already refunded) return the same refund instead of a second one.
async function refundOrder(order: RefundableOrder, requestId: string) {
  if (order.stripeSessionId.startsWith('fake_')) return 'fake_refund' // dev FAKE_PAYMENT orders
  if (order.provider === 'paypal') return refundPaypalOrder(order, `tool-update-refund-${requestId}`)
  const stripe = useStripe()
  const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId)
  const paymentIntent = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id
  if (!paymentIntent) throw createError({ statusCode: 502, statusMessage: 'No payment to refund for this order' })
  const refund = await stripe.refunds.create({ payment_intent: paymentIntent }, { idempotencyKey: `tool-update-refund-${requestId}` })
  return refund.id
}

// Rejects an open request and refunds it. The refund happens first: if Stripe fails,
// nothing is marked and the admin can simply try again.
export async function rejectUpdateRequest(requestId: string, reason: string) {
  const request = await prisma.toolUpdateRequest.findUnique({ where: { id: requestId } })
  if (!request) throw createError({ statusCode: 404, statusMessage: 'Update request not found' })
  if (!OPEN_UPDATE_STATUSES.includes(request.status as (typeof OPEN_UPDATE_STATUSES)[number])) {
    throw conflict('This update request is already closed.')
  }
  const order = await prisma.promoteOrder.findUnique({ where: { id: request.orderId }, select: refundableOrderSelect })
  if (!order) throw createError({ statusCode: 404, statusMessage: 'Order not found' })

  let refundId: string
  try {
    refundId = await refundOrder(order, request.id)
  } catch (err: any) {
    // Our own errors pass through; anything from Stripe (which carries its own statusCode,
    // e.g. 404 for a missing session) becomes a clear 502 instead of looking like "not found".
    if (isError(err)) throw err
    throw createError({ statusCode: 502, statusMessage: 'Stripe refund failed', message: `Refund failed: ${err?.message ?? 'unknown error'}` })
  }

  return prisma.$transaction(async (tx) => {
    const { count } = await tx.toolUpdateRequest.updateMany({
      where: { id: requestId, status: { in: [...OPEN_UPDATE_STATUSES] } },
      data: { status: 'REJECTED', rejectionReason: reason, refundId, reviewedAt: new Date() }
    })
    if (count !== 1) throw conflict('This update request is already closed.')
    await tx.promoteOrder.update({ where: { id: order.id }, data: { status: 'REFUNDED' } })
    return { id: requestId, status: 'REJECTED' as const, refundId }
  })
}
