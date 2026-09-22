// Nitro's `cors: true` route rule (see nuxt.config.ts) only attaches
// Access-Control-* response headers — it does not make an OPTIONS request
// actually match a route. Our API endpoints are defined per-method
// (e.g. `index.post.ts`), so a browser's CORS preflight OPTIONS request has
// nowhere to land and falls through to Nitro's 404 handler. A preflight
// response without a 2xx status fails the browser's CORS check even though
// the headers were present, so we short-circuit it here before routing.
//
// `/api/admin/**` is intentionally excluded: it's marked `cors: false`
// because it's only ever called same-origin from the admin UI, and
// same-origin requests never trigger a preflight in the first place.
export default defineEventHandler((event) => {
  if (getMethod(event) !== 'OPTIONS') return
  if (!event.path.startsWith('/api/') || event.path.startsWith('/api/admin/')) return

  setResponseStatus(event, 204)
  return ''
})
