// Admin image upload for a GPT's picture. Returns { url }.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { data, ext } = await readImageUpload(event)
  return { url: await saveImage('gpts/admin', data, ext) }
})
