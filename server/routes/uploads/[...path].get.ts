// Serves uploaded images (see server/utils/uploads.ts). File names are random
// and never reused, so they can be cached forever.
export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, 'path') ?? ''
  const key = storageKeyOf(path)
  const data = key ? await useStorage('uploads').getItemRaw<Buffer>(key) : null
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  setResponseHeaders(event, {
    'Content-Type': CONTENT_TYPES[path.split('.').pop()!] ?? 'application/octet-stream',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'"
  })
  return data
})
