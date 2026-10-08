// POST /api/ads/impressions { ids: [campaignId…] }
// Sent by the sponsored slots once they have actually been on screen.
export default defineEventHandler(async (event) => {
  const body = await readBody<{ ids?: unknown }>(event)
  const ids = Array.isArray(body?.ids)
    ? [...new Set(body.ids.filter((id): id is string => typeof id === 'string' && id.length <= 40))].slice(0, 5)
    : []
  if (ids.length) await countAdImpressions(ids)
  return { ok: true }
})
