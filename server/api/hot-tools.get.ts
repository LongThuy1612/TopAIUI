// GET /api/hot-tools?locale= → the home page's Hot this week: the most viewed / visited /
// saved tools of the last 7 days (server/utils/toolStats.ts). The same for every visitor,
// so cached. Not under /api/tools/: a tool with the slug "hot" would clash.
export default defineCachedEventHandler(async (event) => {
  return { items: await hotTools(normalizeLocale(getQuery(event).locale), 10) }
}, {
  name: 'api-hot-tools',
  maxAge: 600,
  swr: true,
  getKey: event => normalizeLocale(getQuery(event).locale),
  shouldBypassCache: () => import.meta.dev
})
