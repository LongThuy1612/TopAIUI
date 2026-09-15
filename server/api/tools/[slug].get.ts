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
      collectionCount: true,
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
      addedOn: true,
      translations: {
        select: { locale: true, shortDesc: true, description: true, whatIs: true, howToUse: true, coreFeatures: true, useCases: true }
      },
      pricingPlans: {
        select: { locale: true, name: true, price: true, period: true, features: true }
      },
      categories: {
        select: {
          slug: true,
          icon: true,
          name: true,
          translations: { select: { locale: true, name: true } }
        }
      },
      tags: {
        select: {
          slug: true,
          translations: { select: { locale: true, name: true } }
        }
      },
      faqs: {
        select: { locale: true, question: true, answer: true }
      }
    }
  })

  if (!tool) {
    throw createError({ statusCode: 404, statusMessage: `Tool "${slug}" not found` })
  }

  const { translations, pricingPlans, categories, tags, faqs, ...rest } = tool
  const translation = pickByLocale(translations, locale)

  return {
    ...rest,
    shortDesc: cleanText(translation?.shortDesc),
    description: cleanText(translation?.description),
    whatIs: translation?.whatIs ?? null,
    howToUse: translation?.howToUse ?? null,
    coreFeatures: translation?.coreFeatures ?? [],
    useCases: translation?.useCases ?? [],
    pricingPlans: pickLocaleGroup(pricingPlans, locale).map((p) => ({ name: p.name, price: p.price, period: p.period, features: p.features })),
    faqs: pickLocaleGroup(faqs, locale).map((f) => ({ question: f.question, answer: f.answer })),
    categories: categories.map((c) => ({ slug: c.slug, icon: c.icon, name: pickByLocale(c.translations, locale)?.name ?? c.name ?? c.slug })),
    tags: tags.map((tg) => ({ slug: tg.slug, name: pickByLocale(tg.translations, locale)?.name ?? tg.slug }))
  }
})
