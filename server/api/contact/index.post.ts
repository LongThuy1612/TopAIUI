import type { ContactSubject } from '@prisma/client'

// Public Contact form. Guests and signed-in users; a signed-in sender is linked to
// the message (Dashboard → My inquiries) and always uses their account email, so the
// reply can't be steered to someone else's address. Rate limited per IP and per email.
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const bad = (code: string, message: string, statusCode = 400) =>
    createError({ statusCode, statusMessage: message, message, data: { code } })

  // Honeypot: a field hidden from people. Bots that fill it get a normal-looking
  // answer and nothing is stored.
  if (typeof body?.website === 'string' && body.website.trim()) return { ok: true }

  let user: { id: string; email: string; name: string | null } | null = null
  if (getHeader(event, 'x-user-token')) {
    try {
      const userId = await requireActiveUser(event)
      user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true } })
    } catch {
      // Expired or revoked session: treat as a guest rather than failing the form.
    }
  }

  // One line: the name goes into the notification email's subject.
  const name = (typeof body?.name === 'string' ? body.name.replace(/\s+/g, ' ').trim() : '') || user?.name || ''
  const email = user?.email ?? (typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '')
  const subject = body?.subject as ContactSubject
  const message = typeof body?.message === 'string' ? body.message.trim() : ''

  if (!name || name.length > CONTACT_NAME_MAX) throw bad('NAME', 'Please enter your name.')
  if (!EMAIL_RE.test(email) || email.length > 254) throw bad('EMAIL', 'Please enter a valid email address.')
  if (!CONTACT_SUBJECTS.includes(subject)) throw bad('SUBJECT', 'Invalid subject.')
  if (message.length < CONTACT_MESSAGE_MIN || message.length > CONTACT_MESSAGE_MAX) {
    throw bad('MESSAGE', `Message must be between ${CONTACT_MESSAGE_MIN} and ${CONTACT_MESSAGE_MAX} characters.`)
  }

  const ipHash = hashIp(visitorIp(event) || 'unknown')
  const now = Date.now()
  for (const { windowMs, max } of CONTACT_LIMITS.perIp) {
    if (await prisma.contactMessage.count({ where: { ipHash, createdAt: { gte: new Date(now - windowMs) } } }) >= max) {
      throw bad('RATE_LIMIT', 'Too many messages. Please try again later.', 429)
    }
  }
  for (const { windowMs, max } of CONTACT_LIMITS.perEmail) {
    if (await prisma.contactMessage.count({ where: { email, createdAt: { gte: new Date(now - windowMs) } } }) >= max) {
      throw bad('RATE_LIMIT', 'Too many messages. Please try again later.', 429)
    }
  }

  const saved = await prisma.contactMessage.create({
    data: {
      userId: user?.id ?? null,
      name,
      email,
      subject,
      message,
      locale: typeof body?.locale === 'string' ? normalizeLocale(body.locale) : null,
      ipHash
    },
    select: { id: true }
  })

  // The message is stored either way; the email to the team is only a heads-up.
  sendMail(contactNotificationMail({ name, email, subject, message, userId: user?.id ?? null }))
    .catch(err => console.error('[mail] contact notification failed', err))

  return { ok: true, id: saved.id }
})
