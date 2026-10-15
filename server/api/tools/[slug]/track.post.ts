// POST /api/tools/<slug>/track { kind: 'view' | 'visit' } — the tool page reports a view
// and a "Visit website" click, for the home page's Hot this week (server/utils/toolStats.ts).
// Always answers 204: nothing to tell the visitor.
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') ?? ''
  const body = await readBody<{ kind?: unknown }>(event).catch(() => null)
  if (slug && isToolEvent(body?.kind)) {
    await trackToolEvent(event, slug, body.kind).catch((err) => {
      console.error('[tools] tracking failed', slug, err)
    })
  }
  setResponseStatus(event, 204)
  return null
})
