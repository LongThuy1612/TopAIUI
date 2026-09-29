export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing tool id' })
  }

  try {
    await prisma.tool.delete({ where: { id } })
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'Tool not found' })
  }

  return { ok: true }
})
