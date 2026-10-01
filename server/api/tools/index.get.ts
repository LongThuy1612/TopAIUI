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
  // Today and New are the same list, always sorted by addedOn (tools without
  // one go last); Today just narrows it to approved tools.
  if (isTodayTab) where.isApproved = true
  if (query.days) {
    const since = new Date()
    since.setDate(since.getDate() - Number(query.days))
    where.createdAt = { gte: since }
  }
  const isNewTab = query.newToday === 'true'
  // Footer archive: tools whose addedOn falls on one UTC calendar day (YYYY-MM-DD).
  const addedDate = /^\d{4}-\d{2}-\d{2}$/.test(String(query.addedDate ?? '')) ? new Date(`${query.addedDate}T00:00:00Z`) : null
  const isArchiveDay = !!addedDate && !Number.isNaN(addedDate.getTime())
  if (isArchiveDay) {
    where.addedOn = { gte: addedDate, lt: new Date(addedDate.getTime() + 24 * 60 * 60 * 1000) }
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
  // id only breaks ties (every tool without addedOn ties), so pages of the
  // infinite scroll don't repeat or skip tools.
  const orderBy = isTodayTab || isNewTab || isArchiveDay
    ? [{ addedOn: { sort: 'desc' as const, nulls: 'last' as const } }, { id: 'asc' as const }]
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
    // Source-URL / source columns reveal where the data was scraped from —
    // keep them out of the public payload.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    items: items.map(({ translations, categories, tags, toolifyUrl, productHuntUrl, source, ...tool }) => {
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
