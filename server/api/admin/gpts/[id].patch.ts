// Save the admin's edits of a GPT listing (any status but REJECTED).
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id') ?? ''
  const data = cleanGptInput(await readBody<Record<string, unknown>>(event) ?? {})
  // A published GPT must keep a name and a description: an incomplete edit only applies
  // to one that isn't live (checked in the write itself, so a publish meanwhile can't race it).
  const complete = data.name.length >= 2 && data.description.length >= 10
  const { count } = await prisma.gpt.updateMany({ where: { id, status: { notIn: complete ? ['REJECTED'] : ['REJECTED', 'PUBLISHED'] } }, data })
  if (count !== 1) {
    const current = await prisma.gpt.findUnique({ where: { id }, select: { status: true } })
    if (current?.status === 'PUBLISHED') {
      throw createError({ statusCode: 400, statusMessage: 'Name and description required', message: 'A published GPT needs a name and a description (10+ characters).' })
    }
    throw createError({ statusCode: 404, statusMessage: 'GPT not found or rejected' })
  }
  return { id }
})
