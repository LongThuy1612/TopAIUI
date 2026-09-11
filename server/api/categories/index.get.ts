export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const locale = String(query.locale ?? 'en')

  const publishedToolFilter = { status: 'PUBLISHED', deletedAt: null } as const

  const categories = await prisma.category.findMany({
    where: { tools: { some: publishedToolFilter } },
    orderBy: [{ isFeatured: 'desc' }, { tools: { _count: 'desc' } }, { viewCount: 'desc' }],
    select: {
      slug: true,
      icon: true,
      isFeatured: true,
      viewCount: true,
      name: true,
      _count: { select: { tools: { where: publishedToolFilter } } },
      translations: { select: { locale: true, name: true } }
    }
  })

  return categories.map((c) => ({
    slug: c.slug,
    name: pickByLocale(c.translations, locale)?.name ?? c.name ?? c.slug,
    icon: c.icon,
    isFeatured: c.isFeatured,
    viewCount: c.viewCount,
    count: c._count.tools
  }))
})
