// "Fetch preview" in the admin editor for a link item: title, summary and cover of the page.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody<{ url?: unknown }>(event)
  const url = typeof body?.url === 'string' ? publicHttpUrl(body.url.trim()) : null
  if (!url) throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Enter a valid http(s) link.' })
  return readLinkPreview(url.href)
})
