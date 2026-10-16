// POST /api/newsletter { email, locale, website } — the home page's "Get the best AI
// tools, weekly" box. Stores the address (nothing is sent yet; admins export the list).
// Always answers the same for a new or an already-listed address, so the form can't be
// used to find out who subscribed. `website` is a field people never see: bots fill it.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PER_HOUR = 5
const recent = new Map<string, number[]>()

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email?: unknown; locale?: unknown; website?: unknown }>(event).catch(() => null)
  const email = String(body?.email ?? '').trim().toLowerCase()
  if (!EMAIL.test(email) || email.length > 254) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Please enter a valid email address.' })
  }
  if (body?.website || !isHumanRequest(event)) return { ok: true }

  const visitor = visitorKey(visitorIp(event))
  const now = Date.now()
  const list = (recent.get(visitor) ?? []).filter(t => now - t < 60 * 60 * 1000)
  if (list.length >= PER_HOUR) {
    throw createError({ statusCode: 429, statusMessage: 'Too many requests', message: 'Please try again later.' })
  }
  if (recent.size > 50_000) recent.clear()
  recent.set(visitor, [...list, now])

  const token = getHeader(event, 'x-user-token')
  const userId = token ? verifyUserToken(token) : null
  await prisma.newsletterSubscriber.createMany({
    data: [{ email, locale: normalizeLocale(body?.locale), userId: userId ?? null }],
    skipDuplicates: true
  })
  return { ok: true }
})
