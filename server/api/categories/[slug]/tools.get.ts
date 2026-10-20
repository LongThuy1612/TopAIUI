import type { H3Event } from 'h3'
import type { Prisma } from '@prisma/client'
import { PUBLIC_LIMITS } from '#shared/research'

// GET /api/categories/<slug>/tools?page=&sort=&pricing=&locale= — a category's own page
// (a group's covers every category under it, server/utils/categoryTree.ts): the category,
// its tools as full cards (pricing plans, what it is, core features, use cases), the top
// tool names for the intro line, and featured tools for the side column.
// Guests reach the first PUBLIC_LIMITS.guestListTools tools, like every list.
const PAGE_SIZE = 10
const SORTS: Record<string, Prisma.ToolOrderByWithRelationInput[]> = {
  default: [{ isFeatured: 'desc' }, { collectionCount: 'desc' }, { averageRating: 'desc' }],
  newest: [{ addedOn: { sort: 'desc', nulls: 'last' } }],
  saved: [{ collectionCount: 'desc' }],
  rating: [{ averageRating: 'desc' }, { reviewCount: 'desc' }],
  name: [{ name: 'asc' }]
}
const PRICING = ['FREE', 'FREEMIUM', 'PAID'] as const
// Own keys only: "?sort=toString" must not pick up Object.prototype's function.
const sortOf = (value: unknown) => (Object.hasOwn(SORTS, String(value)) ? String(value) : 'default')
const LIVE = { status: 'PUBLISHED', deletedAt: null } as const

async function categoryTools(event: H3Event, isGuest: boolean) {
  const slug = String(getRouterParam(event, 'slug') ?? '')
  const query = getQuery(event)
  const locale = normalizeLocale(query.locale)
  const page = Math.min(10_000, Math.max(1, Math.floor(Number(query.page)) || 1))
  const sort = sortOf(query.sort)
  const pricing = PRICING.find(p => p === query.pricing)
  const locales = [...new Set([locale, 'en'])]

  const tree = await categoryTreeIndex()
  const slugs = tree.coverage.get(slug) ?? [slug]
  const groupSlug = tree.groupOf.get(slug)
  const inCategory = { ...LIVE, categories: { some: { slug: { in: slugs } } } } satisfies Prisma.ToolWhereInput
  const where: Prisma.ToolWhereInput = { ...inCategory, ...(pricing && { pricingType: pricing }) }

  const guestRoom = isGuest ? Math.max(0, PUBLIC_LIMITS.guestListTools - (page - 1) * PAGE_SIZE) : Infinity
  const take = Math.min(PAGE_SIZE, guestRoom)
  const names = { select: { locale: true, name: true, description: true }, where: { locale: { in: locales } } }

  const [category, group, rows, total, categoryTotal, top, featuredHere] = await Promise.all([
    prisma.category.findUnique({ where: { slug }, select: { slug: true, name: true, icon: true, translations: names } }),
    groupSlug && groupSlug !== slug
      ? prisma.category.findUnique({ where: { slug: groupSlug }, select: { slug: true, name: true, translations: names } })
      : Promise.resolve(null),
    take > 0
      ? prisma.tool.findMany({
          where,
          orderBy: [...SORTS[sort]!, { id: 'asc' }],
          skip: (page - 1) * PAGE_SIZE,
          take,
          select: {
            slug: true,
            name: true,
            logoUrl: true,
            website: true,
            pricingType: true,
            averageRating: true,
            reviewCount: true,
            collectionCount: true,
            translations: { where: { locale: { in: locales } }, select: { locale: true, shortDesc: true, whatIs: true, coreFeatures: true, useCases: true } },
            pricingPlans: { where: { locale: { in: locales } }, select: { locale: true, name: true, price: true, period: true, features: true } }
          }
        })
      : Promise.resolve([]),
    prisma.tool.count({ where }),
    // The heading's count is the whole category's, whatever the pricing filter.
    pricing ? prisma.tool.count({ where: inCategory }) : Promise.resolve(null),
    prisma.tool.findMany({ where: inCategory, orderBy: [...SORTS.default!, { id: 'asc' }], take: 10, select: { name: true } }),
    prisma.tool.findMany({ where: { ...inCategory, isFeatured: true }, orderBy: [{ collectionCount: 'desc' }, { id: 'asc' }], take: 8, select: featuredSelect(locales) })
  ])
  // Featured: this category's first, then any, eight in all.
  const featuredRows = featuredHere.length >= 8
    ? featuredHere
    : [...featuredHere, ...await prisma.tool.findMany({
        where: { ...LIVE, isFeatured: true, slug: { notIn: featuredHere.map(f => f.slug) } },
        orderBy: [{ collectionCount: 'desc' }, { id: 'asc' }],
        take: 8 - featuredHere.length,
        select: featuredSelect(locales)
      })]

  const nameOf = (c: { slug: string; name: string | null; translations: { locale: string; name: string }[] }) =>
    cleanText(pickByLocale(c.translations, locale)?.name) ?? cleanText(c.name) ?? c.slug
  const translation = category && pickByLocale(category.translations, locale)

  return {
    category: category && {
      slug: category.slug,
      name: nameOf(category),
      icon: category.icon,
      description: cleanText(translation?.description),
      group: group && { slug: group.slug, name: nameOf(group) }
    },
    items: rows.map((tool) => {
      const t = pickByLocale(tool.translations, locale)
      return {
        slug: tool.slug,
        name: tool.name,
        logoUrl: resolveToolImage(tool.logoUrl),
        website: safeLinkUrl(tool.website),
        pricingType: tool.pricingType,
        averageRating: tool.averageRating,
        reviewCount: tool.reviewCount,
        collectionCount: tool.collectionCount,
        shortDesc: cleanText(t?.shortDesc),
        whatIs: cleanText(t?.whatIs),
        coreFeatures: (t?.coreFeatures ?? []).filter(Boolean),
        useCases: (t?.useCases ?? []).filter(Boolean),
        pricingPlans: pickLocaleGroup(tool.pricingPlans, locale).map(({ locale: _l, ...plan }) => plan)
      }
    }),
    total,
    categoryTotal: categoryTotal ?? total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    loginRequired: isGuest && total > PUBLIC_LIMITS.guestListTools && (page - 1) * PAGE_SIZE + take >= PUBLIC_LIMITS.guestListTools,
    topNames: top.map(t => t.name),
    featured: featuredRows.map(f => ({
      slug: f.slug,
      name: f.name,
      logoUrl: resolveToolImage(f.logoUrl),
      pricingType: f.pricingType,
      shortDesc: cleanText(pickByLocale(f.translations, locale)?.shortDesc)
    }))
  }
}

function featuredSelect(locales: string[]) {
  return {
    slug: true,
    name: true,
    logoUrl: true,
    pricingType: true,
    translations: { where: { locale: { in: locales } }, select: { locale: true, shortDesc: true } }
  } satisfies Prisma.ToolSelect
}

// Guests: the same for everyone, cached; logged in: direct. The cache key is built from
// the parameters the list reads (normalized), never the raw URL — any extra or odd query
// string must not mint a new cache entry.
const forGuests = defineCachedEventHandler(event => categoryTools(event, true), {
  name: 'api-category-tools',
  maxAge: 300,
  swr: true,
  getKey: (event) => {
    const q = getQuery(event)
    const slug = String(getRouterParam(event, 'slug') ?? '').slice(0, 120)
    const sort = sortOf(q.sort)
    const pricing = PRICING.find(p => p === q.pricing) ?? 'all'
    const page = Math.min(10_000, Math.max(1, Math.floor(Number(q.page)) || 1))
    return [slug, sort, pricing, page, normalizeLocale(q.locale)].join(':')
  },
  shouldBypassCache: () => import.meta.dev
})

export default defineEventHandler((event) => {
  const token = getHeader(event, 'x-user-token')
  if (token && verifyUserToken(token)) return categoryTools(event, false)
  return forGuests(event)
})
