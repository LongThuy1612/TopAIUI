// POST /api/admin/ads/<id> { action: 'approve' | 'reject' | 'pause' | 'resume' | 'addClicks', reason?, clicks?, seen? }
// `seen` (approve): the landingUrl / pendingLandingUrl the admin reviewed.
// Rejecting a campaign that never ran refunds its orders; rejecting a landing URL
// change only drops the change.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody<{ action?: string; reason?: unknown; clicks?: unknown; seen?: { landingUrl?: unknown; pendingLandingUrl?: unknown } }>(event)
  const id = getRouterParam(event, 'id') ?? ''

  switch (body?.action) {
    case 'reject': {
      const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : ''
      if (!reason) throw createError({ statusCode: 400, statusMessage: 'A reason is required.', message: 'A reason is required.' })
      return adminAdAction(id, { action: 'reject', reason })
    }
    case 'addClicks':
      return adminAdAction(id, { action: 'addClicks', clicks: Number(body.clicks) })
    case 'approve': {
      const url = (v: unknown) => (typeof v === 'string' ? v : null)
      if (!body.seen) throw createError({ statusCode: 400, statusMessage: 'Missing reviewed URLs' })
      return adminAdAction(id, { action: 'approve', seen: { landingUrl: url(body.seen.landingUrl), pendingLandingUrl: url(body.seen.pendingLandingUrl) } })
    }
    case 'pause':
    case 'resume':
      return adminAdAction(id, { action: body.action })
    default:
      throw createError({ statusCode: 400, statusMessage: 'Unknown action' })
  }
})
