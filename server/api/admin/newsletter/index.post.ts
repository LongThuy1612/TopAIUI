// Admin → Newsletter: add an address by hand (someone asked by email, an event list…).
// An address already on the list answers 409.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody<{ email?: unknown; locale?: unknown }>(event).catch(() => null)
  const email = String(body?.email ?? '').trim().toLowerCase()
  if (!EMAIL.test(email) || email.length > 254) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Please enter a valid email address.' })
  }
  const { count } = await prisma.newsletterSubscriber.createMany({ data: [{ email, locale: normalizeLocale(body?.locale) }], skipDuplicates: true })
  if (!count) throw createError({ statusCode: 409, statusMessage: 'Conflict', message: 'This address is already on the list.' })
  return { ok: true }
})
