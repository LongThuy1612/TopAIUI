import { defaultLocale, locales } from '../../i18n/settings'

// Cached pages (routeRules `cache` in nuxt.config.ts) are rendered with only
// the request headers listed in `varies`, and the cache key is the URL plus
// those headers. The language comes from the locale cookie or, failing that,
// Accept-Language (i18n strategy no_prefix), so neither can just be listed:
// the raw Cookie header would split the cache per visitor, and without it
// every cached page was rendered in the default language.
//
// So for cached pages the locale is resolved here, the way i18n would, and the
// Cookie header is replaced with just that locale cookie: `varies: ['cookie']`
// then keys the cache by locale (one entry per language) and the render sees
// the right language. These pages are public; the user session lives in
// localStorage, not a cookie, so nothing else is lost.
const COOKIE_KEY = 'topainew_locale'
const SUPPORTED = new Set<string>(locales)

function fromCookie(cookie: string | undefined) {
  const match = cookie?.match(new RegExp(`(?:^|;\\s*)${COOKIE_KEY}=([^;]*)`))
  // Locale codes are plain ASCII, so a valid value never needs decoding — and
  // decodeURIComponent would throw (→ 500) on a malformed one like "%E0".
  const value = match?.[1]?.trim()
  return value && SUPPORTED.has(value) ? value : null
}

// "vi-VN,vi;q=0.9,en;q=0.8" → first supported primary subtag by quality.
function fromAcceptLanguage(header: string | undefined) {
  if (!header) return null
  const ranked = header.split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';')
      const q = Number(params.find(p => p.trim().startsWith('q='))?.trim().slice(2) ?? 1)
      return { code: tag!.trim().toLowerCase().split('-')[0]!, q: Number.isNaN(q) ? 0 : q }
    })
    .filter(l => l.q > 0)
    .sort((a, b) => b.q - a.q)
  return ranked.find(l => SUPPORTED.has(l.code))?.code ?? null
}

export default defineEventHandler((event) => {
  if (event.method !== 'GET' && event.method !== 'HEAD') return
  if (!getRouteRules(event).cache) return

  const headers = event.node.req.headers
  const locale = fromCookie(headers.cookie) ?? fromAcceptLanguage(headers['accept-language']) ?? defaultLocale
  headers.cookie = `${COOKIE_KEY}=${locale}`
  delete headers['accept-language']
})
