// Cached like the /tools/** page it feeds (see nuxt.config.ts routeRules), so
// client-side navigation to a tool doesn't hit the database every time either.
export default defineCachedEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const query = getQuery(event)
  const locale = String(query.locale ?? 'en')

  // Analytics are keyed by slug, so both queries can run at once.
  const [tool, analyticsRow] = await Promise.all([prisma.tool.findFirst({
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
  }), prisma.toolAnalyticsData.findUnique({
    where: { toolSlug: slug },
    select: {
      monthlyVisits: true, trafficVisits: true, trafficSources: true, engagement: true, growthMetrics: true,
      organicKeywords: true, paidKeywords: true, geography: true, globalRanking: true, highestTrafficCountry: true,
      highestTrafficCountryRanking: true, category: true, categoryRanking: true, relatedApps: true,
      yearFounded: true, employeeRange: true
    }
  })])

  if (!tool) {
    throw createError({ statusCode: 404, statusMessage: `Tool "${slug}" not found` })
  }

  const { translations, pricingPlans, categories, tags, faqs, ...rest } = tool
  const translation = pickByLocale(translations, locale)

  return {
    ...rest,
    icon: resolveToolImage(rest.icon),
    logoUrl: resolveToolImage(rest.logoUrl),
    screenshotUrl: resolveToolImage(rest.screenshotUrl),
    images: resolveToolImages(rest.images),
    shortDesc: cleanText(translation?.shortDesc),
    description: cleanText(translation?.description),
    whatIs: translation?.whatIs ?? null,
    howToUse: translation?.howToUse ?? null,
    coreFeatures: translation?.coreFeatures ?? [],
    useCases: translation?.useCases ?? [],
    pricingPlans: pickLocaleGroup(pricingPlans, locale).map((p) => ({ name: p.name, price: p.price, period: p.period, features: p.features })),
    faqs: pickLocaleGroup(faqs, locale).map((f) => ({ question: f.question, answer: f.answer })),
    categories: categories.map((c) => ({ slug: c.slug, icon: c.icon, name: cleanText(pickByLocale(c.translations, locale)?.name) ?? cleanText(c.name) ?? c.slug })),
    tags: tags.map((tg) => ({ slug: tg.slug, name: cleanText(pickByLocale(tg.translations, locale)?.name) ?? tg.slug })),
    analytics: normalizeAnalytics(analyticsRow)
  }
}, { name: 'api-tool', maxAge: 300, swr: true, shouldBypassCache: () => import.meta.dev })

type AnalyticsRow = {
  monthlyVisits: number | null
  trafficVisits: unknown
  trafficSources: unknown
  engagement: unknown
  growthMetrics: unknown
  organicKeywords: unknown
  paidKeywords: unknown
  geography: unknown
  globalRanking: number | null
  highestTrafficCountry: number | null
  highestTrafficCountryRanking: number | null
  category: string | null
  categoryRanking: number | null
  relatedApps: unknown
  yearFounded: string | null
  employeeRange: string | null
}

// Merges organic + paid keywords, keeps the higher-volume entry per keyword.
function normalizeKeywords(organic: unknown, paid: unknown) {
  const byKeyword = new Map<string, { keyword: string; volume: number; type: 'organic' | 'paid' }>()
  const add = (list: unknown, type: 'organic' | 'paid') => {
    for (const item of toList(list)) {
      const r = asRecord(item)
      const keyword = String(r.keyword ?? r.name ?? '').trim()
      if (!keyword) continue
      const volume = asNumber(r.volume) ?? 0
      const prev = byKeyword.get(keyword.toLowerCase())
      if (!prev || volume > prev.volume) byKeyword.set(keyword.toLowerCase(), { keyword, volume, type })
    }
  }
  add(organic, 'organic')
  add(paid, 'paid')
  return [...byKeyword.values()].sort((a, b) => b.volume - a.volume).slice(0, 10)
}

// relatedApps is { apps_0: [...Google Play], apps_1: [...App Store] } and
// mixes in unrelated apps; only keep ones that have actual ratings.
function normalizeApps(relatedApps: unknown) {
  return Object.values(asRecord(relatedApps))
    .flatMap(toList)
    .map(asRecord)
    .filter(a => a.valid !== false && (asNumber(a.ratecount) ?? 0) > 0)
    .map(a => ({
      title: String(a.title ?? ''),
      icon: typeof a.icon === 'string' ? a.icon : null,
      store: asNumber(a.store) === 1 ? 'appstore' as const : 'googleplay' as const,
      rating: asNumber(a.rating),
      ratingCount: asNumber(a.ratecount) ?? 0
    }))
    .sort((a, b) => b.ratingCount - a.ratingCount)
    .slice(0, 4)
}

// Flattens the old ToolAnalyticsData JSON blobs into display-ready numbers:
// percentages as 0-100, durations in seconds, chart points sorted by month.
function normalizeAnalytics(row: AnalyticsRow | null) {
  if (!row) return null

  const chart = Object.entries(asRecord(row.trafficVisits))
    .map(([month, v]) => ({ month: month.slice(0, 7), visits: asNumber(v) ?? 0 }))
    .sort((a, b) => a.month.localeCompare(b.month))

  const sources = Object.entries(asRecord(row.trafficSources))
    .map(([name, v]) => ({ name, pct: asNumber(v) ?? 0 }))
    .sort((a, b) => b.pct - a.pct)

  const engagement = asRecord(row.engagement)
  const bounce = asNumber(engagement.bounceRate)
  // Month-over-month growth from the same visits the chart shows. growthMetrics.change
  // isn't reliable on its own: SimilarWeb rows store it as a fraction (0.12 = 12%) but
  // Toolify-sourced rows as a percentage (735.06 = 735%), and x100 on the latter gave
  // "73505.9%". It is only used when the chart has fewer than two months.
  const [prev, last] = chart.slice(-2).map(p => p.visits)
  const change = chart.length >= 2 && prev! > 0
    ? (last! - prev!) / prev!
    : asNumber(asRecord(row.growthMetrics).change)

  return {
    monthlyVisits: row.monthlyVisits ?? chart.at(-1)?.visits ?? null,
    growthPct: change == null ? null : change * 100,
    avgVisitDuration: asNumber(engagement.timeOnSite ?? engagement.avgVisitDuration),
    pagesPerVisit: asNumber(engagement.pagePerVisit ?? engagement.pagesPerVisit),
    bounceRatePct: bounce == null ? null : bounce * 100,
    chart,
    sources,
    keywords: normalizeKeywords(row.organicKeywords, row.paidKeywords),
    geography: normalizeGeography(row.geography),
    ranking: {
      global: row.globalRanking,
      country: row.highestTrafficCountry ? COUNTRY_NUMERIC_TO_ALPHA2[row.highestTrafficCountry] ?? null : null,
      countryRank: row.highestTrafficCountryRanking,
      // "Computers_Electronics_and_Technology/Graphics_Multimedia_and_Web_Design" → "Graphics Multimedia and Web Design"
      category: row.category ? row.category.split('/').pop()!.replace(/_/g, ' ') : null,
      categoryRank: row.categoryRanking
    },
    yearFounded: row.yearFounded,
    employeeRange: row.employeeRange,
    apps: normalizeApps(row.relatedApps)
  }
}
