// PATCH /api/social-queries/<id> { name?, keywords?, active? }
// Editing keeps the query's slot; turning a paused query back on needs a free slot.
export default defineEventHandler(async (event) => {
  const userId = await requireActiveUser(event)
  const id = getRouterParam(event, 'id') ?? ''
  const body = await readBody<{ name?: unknown; keywords?: unknown; active?: unknown }>(event) ?? {}
  const current = await ownQuery(userId, id)
  const data: { name?: string; keywords?: string[]; active?: boolean } = cleanQueryInput(body, true)
  if (typeof body.active === 'boolean') data.active = body.active

  if (data.active && !current.active) {
    return withActiveSlot(userId, tx => tx.socialQuery.update({ where: { id }, data }))
  }
  return prisma.socialQuery.update({ where: { id }, data })
})
