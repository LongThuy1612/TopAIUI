// Admin image upload for articles (cover or inside the text). Returns { url }.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { data, ext } = await readImageUpload(event)
  return { url: await saveImage('articles', data, ext) }
})
