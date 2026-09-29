export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing tool id' })
  }

  const body = await readBody(event)
  const locale = String(body.locale ?? '')
  if (!locale) {
    throw createError({ statusCode: 400, statusMessage: 'Missing locale' })
  }

  const data = {
    shortDesc: body.shortDesc ?? null,
    description: body.description ?? null,
    whatIs: body.whatIs ?? null,
    howToUse: body.howToUse ?? null,
    coreFeatures: Array.isArray(body.coreFeatures) ? body.coreFeatures : [],
    useCases: Array.isArray(body.useCases) ? body.useCases : [],
    isManualOverride: Boolean(body.isManualOverride)
  }

  try {
    return await prisma.toolTranslation.upsert({
      where: { toolId_locale: { toolId: id, locale } },
      update: data,
      create: { toolId: id, locale, ...data }
    })
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'Tool not found' })
  }
})
