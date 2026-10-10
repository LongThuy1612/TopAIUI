import { guestPost } from '#shared/promote'

// Upload one image for a guest post (cover or inside the text; multipart field "file").
// Returns { url }; it only counts once the submission is saved with it — unused files are
// removed by the nightly uploads cleanup. Only for someone who can write a guest post (has
// the credits for one, or one still open for edits), so the endpoint isn't free storage.
// Uploads per user per 24 h (a burst limit — unused files are deleted by the cleanup).
const MAX_POST_IMAGES = 100

export default defineEventHandler(async (event) => {
  const userId = await requireActiveUser(event)
  const [user, open] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { postCredits: true } }),
    prisma.postSubmission.count({ where: { userId, type: 'GUEST_POST', status: { in: OPEN_STATUSES } } })
  ])
  if ((user?.postCredits ?? 0) < guestPost.credits.GUEST_POST && !open) {
    throw createError({ statusCode: 403, statusMessage: 'Not enough credits', message: 'Buy credits for a guest post first.' })
  }
  const folder = `posts/${userId.toLowerCase()}`
  // Count only today's uploads: images of published posts stay forever and must not use
  // up the allowance of a customer who writes many posts.
  const storage = useStorage('uploads')
  const since = Date.now() - 24 * 60 * 60 * 1000
  let recent = 0
  for (const key of await storage.getKeys(folder.replaceAll('/', ':'))) {
    const { mtime } = await storage.getMeta(key)
    if (mtime && new Date(mtime).getTime() > since) recent++
  }
  if (recent >= MAX_POST_IMAGES) {
    throw createError({ statusCode: 429, statusMessage: 'Too many images', message: 'Too many images uploaded today. Please try again tomorrow.' })
  }
  const { data, ext } = await readImageUpload(event)
  return { url: await saveImage(folder, data, ext) }
})
