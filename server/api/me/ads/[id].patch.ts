// PATCH /api/me/ads/<id> { landingUrl?: string | null, paused?: boolean }
// The owner changes the landing URL (may need a review again) or pauses / resumes.
export default defineEventHandler(async (event) => {
  const userId = await requireActiveUser(event)
  const body = await readBody<{ landingUrl?: unknown; paused?: unknown }>(event)
  const input: { landingUrl?: string | null; paused?: boolean } = {}

  if (body?.landingUrl !== undefined) {
    const url = typeof body.landingUrl === 'string' ? body.landingUrl.trim() : ''
    if (url && (url.length > 2000 || !safeHttpUrl(url))) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid landing URL.', message: 'Invalid landing URL.' })
    }
    input.landingUrl = url || null
  }
  if (typeof body?.paused === 'boolean') input.paused = body.paused

  return updateOwnCampaign(userId, getRouterParam(event, 'id') ?? '', input)
})
