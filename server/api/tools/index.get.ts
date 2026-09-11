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

  const sortMap: Record<string, Prisma.ToolOrderByWithRelationInput | Prisma.ToolOrderByWithRelationInput[]> = {
    newest: { createdAt: 'desc' },
    featured: [{ isAd: 'desc' }, { adPriority: 'desc' }, { isFeatured: 'desc' }, { viewCount: 'desc' }],
    name: { name: 'asc' },
    traffic: { monthlyVisits: 'desc' },
    trending: { monthlyVisits: 'desc' },
    growth1m: { last1MonthGrowth: 'desc' },
    growth3m: { last3MonthGrowth: 'desc' },
    growth6m: { last6MonthGrowth: 'desc' }
  }
  const orderBy = sortMap[String(query.sort)] ?? sortMap.newest

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
        shortDesc: translation?.shortDesc ?? null,
        description: translation?.description ?? null,
        categories: categories.map((c) => ({ slug: c.slug, icon: c.icon, name: pickByLocale(c.translations, locale)?.name ?? c.name ?? c.slug })),
        tags: tags.map((tg) => ({ slug: tg.slug, name: pickByLocale(tg.translations, locale)?.name ?? tg.slug }))
      }
    }),
    total,
    page,
    pageCount: Math.ceil(total / limit)
  }
})
