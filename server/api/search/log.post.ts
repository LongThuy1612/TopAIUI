// The search page reports what was searched (POST { q, locale }) — Popular searches on the
// home page (server/utils/searchTerms.ts). Always answers 204: nothing to tell the visitor.
export default defineEventHandler(async (event) => {
  const body = await readBody<{ q?: unknown; locale?: unknown }>(event).catch(() => null)
  await logSearch(event, body?.q, normalizeLocale(body?.locale)).catch((err) => {
    console.error('[search] logging a search failed', err)
  })
  setResponseStatus(event, 204)
  return null
})
