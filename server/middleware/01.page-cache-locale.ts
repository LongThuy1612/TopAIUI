import { defaultLocale, locales } from '../../i18n/settings'

// Cached pages (routeRules `cache` in nuxt.config.ts) are rendered with only
// the request headers listed in `varies`, and the cache key is the URL plus
// those headers.
//
// The language is in the URL (i18n strategy prefix_except_default: /vi/…), so a
// cached page needs no cookie at all — it is dropped, giving one entry per URL
// instead of one per visitor. The exception is the site root "/": i18n sends a
// first-time visitor there to their language (detectBrowserLanguage, redirectOn
// "root") from the locale cookie or Accept-Language. For "/" the locale is
// resolved here the way i18n would, and the Cookie header is replaced with just
// that locale cookie, so `varies: ['cookie']` keeps one entry (page or redirect)
// per language. These pages are public; the user session lives in localStorage.
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
  if (event.path.split('?')[0] === '/') {
    const locale = fromCookie(headers.cookie) ?? fromAcceptLanguage(headers['accept-language']) ?? defaultLocale
    headers.cookie = `${COOKIE_KEY}=${locale}`
  } else {
    delete headers.cookie
  }
  delete headers['accept-language']
})
