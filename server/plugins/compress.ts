import { gzipSync } from 'node:zlib'

// Gzip for dynamic responses: rendered pages, API JSON, i18n messages. Nitro only
// pre-compresses static files, and production has no reverse proxy in front yet
// (docker on :3000) — uncompressed, a page's HTML + JSON was several hundred KB.
// Skipped when something upstream already encoded the body; a proxy added later
// can compress instead (it won't re-encode an already gzipped response).
const COMPRESSIBLE = /^(text\/|application\/(json|javascript|xml|ld\+json|manifest\+json)|image\/svg\+xml)/
const MIN_BYTES = 1024

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('beforeResponse', (event, response) => {
    if (event.method === 'HEAD' || event.handled) return
    // Nuxt renders error pages through an internal request that forwards the
    // visitor's headers (Accept-Encoding too) and reads the body back as text — it
    // must stay plain; the outer response is what reaches the browser.
    if (event.path.startsWith('/__nuxt_error') || getRequestHeader(event, 'x-nuxt-error')) return
    if (!/\bgzip\b/.test(getRequestHeader(event, 'accept-encoding') ?? '')) return
    if (getResponseHeader(event, 'content-encoding')) return
    const status = getResponseStatus(event)
    if (status === 204 || status === 304 || (status >= 300 && status < 400)) return

    let text: string
    let type = String(getResponseHeader(event, 'content-type') ?? '')
    const body = response.body
    if (typeof body === 'string') {
      text = body
    } else if (Array.isArray(body) || (body !== null && typeof body === 'object' && Object.getPrototypeOf(body) === Object.prototype)) {
      // h3 would JSON-encode a plain object/array itself; do it here to compress it.
      text = JSON.stringify(body)
      type ||= 'application/json; charset=utf-8'
    } else {
      return // streams, buffers, null…
    }
    if (!COMPRESSIBLE.test(type) || Buffer.byteLength(text) < MIN_BYTES) return

    response.body = gzipSync(text)
    setResponseHeader(event, 'content-type', type)
    setResponseHeader(event, 'content-encoding', 'gzip')
    removeResponseHeader(event, 'content-length')
    appendResponseHeader(event, 'vary', 'Accept-Encoding')
  })
})
