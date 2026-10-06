import { getResponseStatus, setResponseStatus } from 'h3'

// A failed useFetch doesn't fail the page: it still renders (empty lists) with
// status 200, and the page cache (routeRules `cache` in nuxt.config.ts) would
// then keep serving that broken page to everyone for minutes, even after a
// short DB / API hiccup is over. The page cache never stores a status >= 400,
// so mark such renders 503: visitors still get the page, it just isn't cached,
// and crawlers read 503 as "try again later" instead of indexing it.
// Client errors (404 etc.) are left alone — those pages are correct to cache.
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:rendered', () => {
    const event = nuxtApp.ssrContext?.event
    if (!event || getResponseStatus(event) >= 400) return

    const serverError = Object.values(nuxtApp.payload._errors ?? {})
      .some(err => err && !(err.statusCode && err.statusCode < 500))
    if (serverError) setResponseStatus(event, 503)
  })
})
