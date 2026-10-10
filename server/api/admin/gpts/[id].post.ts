// POST { action: 'publish' | 'hide' | 'refetch' | 'reject', reason? } — see server/utils/gpts.ts.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody<{ action?: string; reason?: unknown }>(event)
  const id = getRouterParam(event, 'id') ?? ''
  switch (body?.action) {
    case 'publish':
    case 'hide':
    case 'refetch':
      return adminGptAction(id, { action: body.action })
    case 'reject':
      return adminGptAction(id, { action: 'reject', reason: typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : '' })
    default:
      throw createError({ statusCode: 400, statusMessage: 'Unknown action' })
  }
})
