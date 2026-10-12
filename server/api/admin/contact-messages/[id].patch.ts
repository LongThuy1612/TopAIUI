import type { ContactStatus } from '@prisma/client'

// Admin: change a contact message's status (e.g. close it without replying, or reopen).
export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN'])
  const id = getRouterParam(event, 'id')!
  const body = await readBody<{ status?: unknown }>(event)
  if (!CONTACT_STATUSES.includes(body?.status as ContactStatus)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid status', message: 'Invalid status' })
  }

  // updateMany so a row deleted meanwhile by another admin gives 404, not a 500.
  const { count } = await prisma.contactMessage.updateMany({ where: { id }, data: { status: body!.status as ContactStatus } })
  if (!count) throw createError({ statusCode: 404, statusMessage: 'Message not found' })
  return { id, status: body!.status }
})
