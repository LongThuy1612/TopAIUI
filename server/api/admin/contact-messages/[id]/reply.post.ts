// Admin: answer a contact message. The reply is saved first (so it shows under the
// sender's Dashboard → My inquiries even if mail fails), then emailed to the sender.
export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN'])
  const id = getRouterParam(event, 'id')!
  const body = await readBody<{ reply?: unknown }>(event)
  const reply = typeof body?.reply === 'string' ? body.reply.trim() : ''
  if (!reply || reply.length > CONTACT_REPLY_MAX) {
    const message = `Reply must be between 1 and ${CONTACT_REPLY_MAX} characters`
    throw createError({ statusCode: 400, statusMessage: message, message })
  }

  const msg = await prisma.contactMessage.findUnique({ where: { id }, select: { name: true, email: true, subject: true, message: true, locale: true } })
  if (!msg) throw createError({ statusCode: 404, statusMessage: 'Message not found' })

  const repliedAt = new Date()
  await prisma.contactMessage.update({ where: { id }, data: { reply, repliedAt, status: 'REPLIED' } })

  let emailed = true
  try {
    await sendMail(contactReplyMail(msg, reply))
  } catch (err) {
    console.error('[mail] contact reply failed', err)
    emailed = false
  }

  return { id, reply, repliedAt, status: 'REPLIED' as const, emailed }
})
