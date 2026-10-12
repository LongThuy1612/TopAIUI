// POST /api/billing/portal → { url } of Stripe's billing portal (card, invoices, cancel).
export default defineEventHandler(async (event) => {
  const userId = await requireActiveUser(event)
  const body = await readBody<{ locale?: unknown }>(event).catch(() => null)
  return { url: await billingPortalUrl(userId, body?.locale) }
})
