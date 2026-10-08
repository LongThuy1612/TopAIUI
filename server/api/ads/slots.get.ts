// GET /api/ads/slots?placement=today&category=<slug>&exclude=<tool slug>&locale=en&limit=1
// The sponsored tools for one page: `limit` of them, capped per placement (MAX_SLOTS in
// server/utils/ads.ts; the sponsor bar gets one featured). Fetched by the browser, never
// baked into the cached page HTML, so slots rotate on every view and a campaign that runs
// out disappears right away.
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const placement = AD_PLACEMENTS.find(p => p === query.placement)
  if (!placement) throw createError({ statusCode: 400, statusMessage: 'Invalid placement' })

  setResponseHeader(event, 'Cache-Control', 'no-store')
  const items = await pickAdSlots(placement, {
    category: typeof query.category === 'string' && query.category !== 'all' ? query.category : undefined,
    exclude: typeof query.exclude === 'string' && query.exclude ? query.exclude : undefined,
    locale: normalizeLocale(query.locale),
    limit: Number(query.limit) || undefined
  })
  return { items }
})
