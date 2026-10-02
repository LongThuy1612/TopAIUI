// Upload one image for the owner's tool (multipart field "file").
// Returns { url } — the form then saves it as logoUrl or into images[] via
// PATCH /api/me/tools/[id]; uploading alone doesn't change the tool.
export default defineEventHandler(async (event) => {
  const { id: userId } = await requireRole(event, ['USER', 'MANAGER', 'ADMIN'])
  const id = getRouterParam(event, 'id')

  const tool = await prisma.tool.findFirst({
    where: { id, ownerId: userId, deletedAt: null },
    select: { id: true, status: true }
  })
  if (!tool) throw createError({ statusCode: 404, statusMessage: 'Tool not found' })
  // Editable tool, or a published one with a paid update being prepared.
  const updating = tool.status === 'PUBLISHED' && await findOpenUpdate(tool.id)
  if (!updating && !ownerCanEdit(tool, await submitModeOf(tool.id))) {
    throw createError({ statusCode: 403, statusMessage: 'This tool can no longer be edited', message: 'This tool can no longer be edited' })
  }

  const { data, ext } = await readImageUpload(event)
  return { url: await saveImage(`tools/${tool.id.toLowerCase()}`, data, ext) }
})
