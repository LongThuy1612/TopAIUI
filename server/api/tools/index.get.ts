import type { Prisma } from '@prisma/client'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(300, Number(query.limit) || 24)
  const locale = String(query.locale ?? 'en')

  // status is hardcoded to 'PUBLISHED' — this endpoint never leaks pending
  // (unapproved) submissions to the public. Admin-only visibility lives in
  // server/api/admin/tools/index.get.ts instead.
  const where: Prisma.ToolWhereInput = { status: 'PUBLISHED', deletedAt: null }
  if (query.category) where.categories = { some: { slug: String(query.category) } }
  if (query.pricing) where.pricingType = String(query.pricing) as Prisma.ToolWhereInput['pricingType']
  if (query.featured === 'true') where.isFeatured = true
  if (query.q) {
    where.name = { contains: String(query.q), mode: 'insensitive' }
  }
  if (query.minRating) where.averageRating = { gt: Number(query.minRating) }
  if (query.region) where.region = String(query.region)
  if (query.source) where.source = String(query.source)
  const isTodayTab = query.today === 'true'
  if (isTodayTab) {
    where.isApproved = true

    // Walk backwards a day at a time (by addedOn) until we find one with
    // enough tools to fill a page; capped so an idle directory can't spin
    // through years of days.
    const maxLookbackDays = 90
    let bestRange: { gte: Date, lt: Date } | null = null
    let bestCount = 0

    for (let offset = 0; offset < maxLookbackDays; offset++) {
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      start.setDate(start.getDate() - offset)
      const end = new Date(start)
      end.setDate(start.getDate() + 1)

      const count = await prisma.tool.count({ where: { ...where, addedOn: { gte: start, lt: end } } })
      if (count > bestCount) {
        bestCount = count
        bestRange = { gte: start, lt: end }
      }
      if (count >= limit) break
    }

    if (bestRange) where.addedOn = bestRange
  }
  if (query.days) {
    const since = new Date()
    since.setDate(since.getDate() - Number(query.days))
    where.createdAt = { gte: since }
  }
  const isNewTab = query.newToday === 'true'
  if (isNewTab) {
    // Walk backwards a day at a time (by createdAt) until we find one with
    // enough tools to fill a page; capped so an idle directory can't spin
    // through years of days.
    const maxLookbackDays = 90
    let bestRange: { gte: Date, lt: Date } | null = null
    let bestCount = 0

    for (let offset = 0; offset < maxLookbackDays; offset++) {
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      start.setDate(start.getDate() - offset)
      const end = new Date(start)
      end.setDate(start.getDate() + 1)

      const count = await prisma.tool.count({ where: { ...where, createdAt: { gte: start, lt: end } } })
      if (count > bestCount) {
        bestCount = count
        bestRange = { gte: start, lt: end }
      }
      if (count >= limit) break
    }

    if (bestRange) where.createdAt = bestRange
  }

  const sortMap: Record<string, Prisma.ToolOrderByWithRelationInput | Prisma.ToolOrderByWithRelationInput[]> = {
    newest: { createdAt: 'desc' },
    featured: [{ isAd: 'desc' }, { adPriority: 'desc' }, { isFeatured: 'desc' }, { viewCount: 'desc' }],
    name: { name: 'asc' },
    traffic: { monthlyVisits: 'desc' },
    trending: { monthlyVisits: 'desc' },
    rating: { averageRating: 'desc' },
    growth1m: { last1MonthGrowth: 'desc' },
    growth3m: { last3MonthGrowth: 'desc' },
    growth6m: { last6MonthGrowth: 'desc' },
    revenue: { monthlyRevenue: 'desc' }
  }
  const orderBy = isTodayTab
    ? { addedOn: 'desc' as const }
    : isNewTab
      ? { createdAt: 'desc' as const }
      : (sortMap[String(query.sort)] ?? sortMap.newest)

  const [items, total] = await Promise.all([
    prisma.tool.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        categories: { select: { slug: true, icon: true, name: true, translations: { select: { locale: true, name: true } } } },
        tags: { select: { slug: true, translations: { select: { locale: true, name: true } } } },
        translations: { select: { locale: true, shortDesc: true, description: true } }
      }
    }),
    prisma.tool.count({ where })
  ])

  return {
    items: items.map(({ translations, categories, tags, ...tool }) => {
      const translation = pickByLocale(translations, locale)
      return {
        ...tool,
        shortDesc: cleanText(translation?.shortDesc),
        description: cleanText(translation?.description),
        categories: categories.map((c) => ({ slug: c.slug, icon: c.icon, name: cleanText(pickByLocale(c.translations, locale)?.name) ?? cleanText(c.name) ?? c.slug })),
        tags: tags.map((tg) => ({ slug: tg.slug, name: cleanText(pickByLocale(tg.translations, locale)?.name) ?? tg.slug }))
      }
    }),
    total,
    page,
    pageCount: Math.ceil(total / limit)
  }
})
