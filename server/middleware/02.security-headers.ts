// Security headers on every response (pages, API, files). A route's own value wins:
// routeRules headers are set before this middleware runs (e.g. Referrer-Policy:
// no-referrer on /reset-password) and are kept; handlers that set one later (the image
// proxy's Content-Security-Policy) replace it.
//
// No Content-Security-Policy for pages: ads, analytics and embeds load scripts and
// frames from many hosts, and a wrong policy breaks them silently.
// HSTS only in production: localhost runs on plain http. No includeSubDomains — other
// subdomains are not known to be https-only.
const HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  ...(!import.meta.dev && { 'Strict-Transport-Security': 'max-age=31536000' })
}

export default defineEventHandler((event) => {
  for (const [name, value] of Object.entries(HEADERS)) {
    if (!event.node.res.hasHeader(name)) setResponseHeader(event, name, value)
  }
})
