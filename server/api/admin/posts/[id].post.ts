// POST /api/admin/posts/<id> { action: 'publish' | 'done' | 'requestChanges' | 'reject', note?, articleId? }
// publish: guest post → new published article. done: link insert placed in articleId.
// requestChanges / reject (credits refunded) need a note for the customer.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody<Record<string, unknown>>(event)
  const id = getRouterParam(event, 'id') ?? ''
  const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 1000) : ''
  switch (body?.action) {
    case 'publish':
      return reviewSubmission(id, { action: 'publish' })
    case 'done':
      return reviewSubmission(id, { action: 'done', articleId: String(body.articleId ?? '') })
    case 'requestChanges':
      return reviewSubmission(id, { action: 'requestChanges', note })
    case 'reject':
      return reviewSubmission(id, { action: 'reject', note })
    default:
      throw createError({ statusCode: 400, statusMessage: 'Unknown action' })
  }
})
