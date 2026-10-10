import type { PostSubmissionType } from '#shared/promote'

// POST /api/me/posts { type: 'GUEST_POST' | 'LINK_INSERT', ...fields } — takes the credits
// (2 / 1) and queues the submission for review.
export default defineEventHandler(async (event) => {
  const userId = await requireActiveUser(event)
  const body = await readBody<Record<string, unknown>>(event)
  const type = body?.type
  if (type !== 'GUEST_POST' && type !== 'LINK_INSERT') throw createError({ statusCode: 400, statusMessage: 'Unknown type' })
  const sub = await createSubmission(userId, type as PostSubmissionType, body)
  return { id: sub.id }
})
