// The owner prepares the paid update of their published tool. Same input as the
// tool form (see parseOwnerToolInput); the changes are kept on the request — the
// live listing only changes when an admin applies them. `submit: true` sends it for
// review; saving again after that moves it back to DRAFT until resubmitted.
export default defineEventHandler(async (event) => {
  const { id: userId } = await requireRole(event, ['USER', 'MANAGER', 'ADMIN'])
  const id = getRouterParam(event, 'id')
  const body = await readBody<Record<string, unknown>>(event)

  const tool = await prisma.tool.findFirst({
    where: { id, ownerId: userId, deletedAt: null },
    select: {
      id: true, logoUrl: true,
      categories: { select: { slug: true } },
      translations: { where: { locale: USER_CONTENT_LOCALE } }
    }
  })
  if (!tool) throw createError({ statusCode: 404, statusMessage: 'Tool not found' })

  const request = await findOpenUpdate(tool.id)
  if (!request || request.userId !== userId) {
    throw createError({ statusCode: 403, statusMessage: 'No paid update for this tool', message: 'Buy an update first to change a published tool.' })
  }

  const changes = mergeChanges(request.changes as unknown as UpdateChanges | null, await parseOwnerToolInput(body))
  const submit = body.submit === true
  if (submit) {
    // What the tool will look like once applied: proposed values over the live ones.
    const live = tool.translations[0]
    assertReadyForReview({
      content: changes.content ?? (live ? { ...live } : null),
      categoryCount: changes.categorySlugs ? changes.categorySlugs.length : tool.categories.length,
      logoUrl: 'logoUrl' in changes.fields ? changes.fields.logoUrl : tool.logoUrl
    })
  }

  // Only while still open — an admin may have applied / rejected it in the meantime.
  const { count } = await prisma.toolUpdateRequest.updateMany({
    where: { id: request.id, status: { in: [...OPEN_UPDATE_STATUSES] } },
    data: {
      changes: changes as unknown as object,
      status: submit ? 'SUBMITTED' : 'DRAFT',
      submittedAt: submit ? new Date() : null
    }
  })
  if (count !== 1) throw createError({ statusCode: 409, statusMessage: 'This update was already reviewed', message: 'This update was already reviewed.' })

  return { ok: true, status: submit ? 'SUBMITTED' : 'DRAFT' }
})
