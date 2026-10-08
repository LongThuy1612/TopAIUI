// GET /api/ads/click/<campaignId>?p=<placement>
// Every sponsored slot links here: the click is recorded (and charged when it counts,
// see chargeAdClick) and the visitor is sent straight on to the advertiser's site.
export default defineEventHandler(async (event) => {
  setResponseHeaders(event, { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' })
  const id = getRouterParam(event, 'id') ?? ''
  const placement = getQuery(event).p
  const target = await chargeAdClick(id, {
    ip: visitorIp(event),
    userAgent: getHeader(event, 'user-agent') ?? '',
    placement: typeof placement === 'string' ? placement : null
  })
  return sendRedirect(event, target ?? '/', 302)
})
