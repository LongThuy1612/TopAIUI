// Admin → Newsletter → "Send me a test": this week's email to the signed-in admin's own
// address, in { locale }. Its unsubscribe link is a dummy one.
const lastTest = new Map<string, number>()

export default defineEventHandler(async (event) => {
  const admin = await requireRole(event, ['ADMIN'])
  const now = Date.now()
  if (now - (lastTest.get(admin.id) ?? 0) < 30_000) {
    throw createError({ statusCode: 429, statusMessage: 'Too many requests', message: 'Wait a few seconds before sending another test.' })
  }
  const user = await prisma.user.findUnique({ where: { id: admin.id }, select: { email: true } })
  if (!user?.email) throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Your account has no email address.' })
  const body = await readBody<{ locale?: unknown }>(event).catch(() => null)
  const mail = await buildNewsletterMail(await pickWeeklyContent(), mailLocale(body?.locale))
  lastTest.set(admin.id, now)
  try {
    await sendMail({ to: user.email, subject: `[Test] ${mail.subject}`, html: mail.html, text: mail.text })
  } catch (err) {
    lastTest.delete(admin.id)
    throw createError({ statusCode: 502, statusMessage: 'Bad Gateway', message: `The email could not be sent: ${(err as Error)?.message ?? err}` })
  }
  return { ok: true, to: user.email }
})
