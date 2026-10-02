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

  // The form PUTs the English tab on every save, edited or not — so compare first.
  const before = locale === 'en'
    ? await prisma.toolTranslation.findUnique({
      where: { toolId_locale: { toolId: id, locale } },
      select: { shortDesc: true, description: true, whatIs: true, howToUse: true, coreFeatures: true, useCases: true }
    })
    : null

  let saved
  try {
    saved = await prisma.toolTranslation.upsert({
      where: { toolId_locale: { toolId: id, locale } },
      update: data,
      create: { toolId: id, locale, ...data }
    })
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'Tool not found' })
  }

  // English text changed on a user-submitted tool (in review or live): the other
  // locales are now out of date, so queue the crawler's job to translate them again.
  const { isManualOverride: _, ...content } = data
  if (locale === 'en' && JSON.stringify(before) !== JSON.stringify(content)) {
    await prisma.tool.updateMany({
      where: { id, ownerId: { not: null }, status: { in: ['PENDING', 'PUBLISHED'] }, deletedAt: null },
      data: QUEUE_AI
    })
  }

  return saved
})
