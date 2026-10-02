// Admin image upload (multipart field "file") for the tool form. Returns { url };
// the form saves it as logoUrl / images[] through the normal tool PATCH / POST.
// ?toolId groups the file with that tool; new tools (no id yet) go to tools/admin.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const toolId = String(getQuery(event).toolId ?? '').toLowerCase()
  const folder = /^[a-z0-9]{10,40}$/.test(toolId) ? `tools/${toolId}` : 'tools/admin'

  const { data, ext } = await readImageUpload(event)
  return { url: await saveImage(folder, data, ext) }
})
