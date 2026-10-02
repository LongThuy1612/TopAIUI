// Publish or reject a user-submitted tool (Tool.ownerId set).
//   publish → status PUBLISHED (the public page goes live). Approval — the
//             isApproved flag + addedOn — stays on the Approved toggle of ToolForm.
//   reject  → CANCELED + rejectionReason, shown to the owner who can fix and resubmit
//   ai      → queue the crawler's AI job again (writes EN if missing, refreshes translations)
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody<{ action?: string; reason?: string }>(event)

  const tool = await prisma.tool.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, ownerId: true, status: true, step2: true, translations: { where: { locale: USER_CONTENT_LOCALE } } }
  })
  if (!tool) throw createError({ statusCode: 404, statusMessage: 'Tool not found' })

  const bad = (message: string) => createError({ statusCode: 400, statusMessage: message, message })

  if (body?.action === 'publish') {
    // The owner is still drafting (never submitted, or pulled it back to edit) — publishing
    // now would put half-written text live.
    if (tool.ownerId && tool.status === 'PENDING' && !tool.step2) throw bad('The owner has not submitted this tool for review yet.')
    if (!contentComplete(tool.translations[0])) throw bad('The English listing is incomplete.')
    return prisma.tool.update({
      where: { id: tool.id },
      data: { status: 'PUBLISHED', step2: true, rejectionReason: null },
      select: { id: true, status: true }
    })
  }

  if (body?.action === 'ai') {
    return prisma.tool.update({
      where: { id: tool.id },
      data: QUEUE_AI,
      select: { id: true, aiSync: true }
    })
  }

  if (body?.action === 'reject') {
    const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 2000) : ''
    if (!reason) throw bad('A reason is required.')
    return prisma.tool.update({
      where: { id: tool.id },
      data: { status: 'CANCELED', isApproved: false, rejectionReason: reason },
      select: { id: true, status: true }
    })
  }

  throw bad('Unknown action.')
})
