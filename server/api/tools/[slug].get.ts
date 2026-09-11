export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const query = getQuery(event)
  const locale = String(query.locale ?? 'en')

  const tool = await prisma.tool.findFirst({
    where: { slug, status: 'PUBLISHED', deletedAt: null },
    select: {
      id: true,
      slug: true,
      name: true,
      icon: true,
      logoUrl: true,
      screenshotUrl: true,
      videoUrl: true,
      images: true,
      website: true,
      affiliateUrl: true,
      couponCode: true,
      twitterUrl: true,
      discordUrl: true,
      productHuntUrl: true,
      averageRating: true,
      reviewCount: true,
      ratingCount: true,
      upvoteCount: true,
      isFeatured: true,
      isJustLaunched: true,
      isVerified: true,
      isFreeTool: true,
      attributes: true,
      pricingType: true,
      companyInfo: true,
      monthlyVisits: true,
      monthlyTraffic: true,
      domainAuthority: true,
      trafficRank: true,
      viewCount: true,
      createdAt: true,
      translations: {
        where: { locale },
        select: { shortDesc: true, description: true, whatIs: true, howToUse: true, coreFeatures: true, useCases: true }
      },
      pricingPlans: {
        where: { locale },
        select: { name: true, price: true, period: true, features: true }
      },
      categories: {
        select: {
          slug: true,
          icon: true,
          name: true,
          translations: { where: { locale }, select: { name: true } }
        }
      },
      tags: {
        select: {
          slug: true,
          translations: { where: { locale }, select: { name: true } }
        }
      },
      faqs: {
        where: { locale },
        select: { question: true, answer: true }
      },
      reviews: {
        where: { status: 'PUBLISHED' },
        select: { rating: true, comment: true, createdAt: true, user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5
      }
    }
  })

  if (!tool) {
    throw createError({ statusCode: 404, statusMessage: `Tool "${slug}" not found` })
  }

  const { translations, categories, tags, reviews, ...rest } = tool
  const translation = translations[0]

  return {
    ...rest,
    shortDesc: translation?.shortDesc ?? null,
    description: translation?.description ?? null,
    whatIs: translation?.whatIs ?? null,
    howToUse: translation?.howToUse ?? null,
    coreFeatures: translation?.coreFeatures ?? [],
    useCases: translation?.useCases ?? [],
    categories: categories.map((c) => ({ slug: c.slug, icon: c.icon, name: c.translations[0]?.name ?? c.name ?? c.slug })),
    tags: tags.map((tg) => ({ slug: tg.slug, name: tg.translations[0]?.name ?? tg.slug })),
    reviews: reviews.map((r) => ({ rating: r.rating, comment: r.comment, createdAt: r.createdAt, userName: r.user?.name ?? null }))
  }
})
