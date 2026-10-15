// GET /api/search/popular?locale= → ['AI Agent', 'Video', …]: the home page's Popular
// searches chips (server/utils/searchTerms.ts). The same for every visitor, so cached.
export default defineCachedEventHandler(async (event) => {
  return popularSearches(normalizeLocale(getQuery(event).locale))
}, {
  name: 'api-search-popular',
  maxAge: 600,
  swr: true,
  getKey: event => normalizeLocale(getQuery(event).locale),
  shouldBypassCache: () => import.meta.dev
})
