// Admin → Newsletter: stops an issue that is still going out (the addresses already sent
// to keep their delivery rows).
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id') ?? ''
  const { count } = await prisma.newsletterIssue.updateMany({ where: { id, status: 'SENDING' }, data: { status: 'CANCELED', finishedAt: new Date() } })
  if (!count) throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'No issue being sent with this id.' })
  return { ok: true }
})
