// POST /api/newsletter/unsubscribe?s=<subscriber id>&t=<token> — from the button on
// /newsletter/unsubscribe and from mail apps' own "Unsubscribe" (List-Unsubscribe-Post,
// RFC 8058, which posts to the URL in the mail's header). Removes the address. The token
// is an HMAC of the id (server/utils/newsletter.ts), so links can't be guessed.
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const id = String(query.s ?? '').slice(0, 64)
  const token = String(query.t ?? '').slice(0, 128)
  if (!id || !token || !checkUnsubscribeToken(id, token)) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'This unsubscribe link is not valid.' })
  }
  // Already gone counts as done: the second click on a link must not show an error.
  await prisma.newsletterSubscriber.deleteMany({ where: { id } })
  return { ok: true }
})
