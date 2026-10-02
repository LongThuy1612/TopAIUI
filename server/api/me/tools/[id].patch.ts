// The owner edits their not-yet-published tool. Saves the basic fields and the
// English listing; with `submit: true` it also sends the tool to the admin
// queue (step2 = content ready), which needs every English field filled in.
// A rejected tool goes back to PENDING on resubmit. Saving a draft after
// submitting pulls the tool back out of the review queue until it's submitted
// again — so an admin never publishes text whose translations are out of date.
// Published tools are changed through a paid update request instead
// (PATCH /api/me/tools/[id]/update-request).
export default defineEventHandler(async (event) => {
  const { id: userId } = await requireRole(event, ['USER', 'MANAGER', 'ADMIN'])
  const id = getRouterParam(event, 'id')
  const body = await readBody<Record<string, unknown>>(event)

  const tool = await prisma.tool.findFirst({
    where: { id, ownerId: userId, deletedAt: null },
    select: { id: true, status: true, step2: true, logoUrl: true, _count: { select: { categories: true } } }
  })
  if (!tool) throw createError({ statusCode: 404, statusMessage: 'Tool not found' })
  if (!ownerCanEdit(tool, await submitModeOf(tool.id))) {
    throw createError({ statusCode: 403, statusMessage: 'This tool can no longer be edited', message: 'This tool can no longer be edited' })
  }

  const { fields, categorySlugs, content } = await parseOwnerToolInput(body)
  const data = toolUpdateData(fields)
  if (categorySlugs) data.categories = { set: categorySlugs.map(slug => ({ slug })) }

  const submit = body.submit === true
  if (submit) {
    // Checked against what the tool will look like after this save, not just the body.
    assertReadyForReview({
      content,
      categoryCount: categorySlugs ? categorySlugs.length : tool._count.categories,
      logoUrl: 'logoUrl' in fields ? fields.logoUrl : tool.logoUrl
    })
    data.step2 = true
    data.status = 'PENDING'
    data.rejectionReason = null
    Object.assign(data, QUEUE_AI) // translate the (new) English listing into every locale
  } else if (tool.status === 'PENDING' && tool.step2) {
    // Edited after submitting: back to draft until "Submit for review" is pressed again.
    data.step2 = false
    data.aiSync = null
  }

  const locale = USER_CONTENT_LOCALE
  try {
    await prisma.$transaction([
      // Re-checked in the write itself: an admin may have published it since the check above.
      prisma.tool.update({ where: { id: tool.id, status: { not: 'PUBLISHED' } }, data }),
      ...(content
        ? [prisma.toolTranslation.upsert({
            where: { toolId_locale: { toolId: tool.id, locale } },
            update: { ...content, isManualOverride: true },
            create: { toolId: tool.id, locale, ...content, isManualOverride: true }
          })]
        : [])
    ])
  } catch (err: any) {
    if (err?.code === 'P2025') {
      throw createError({ statusCode: 403, statusMessage: 'This tool can no longer be edited', message: 'This tool can no longer be edited' })
    }
    throw err
  }

  return { ok: true, submitted: submit }
})
