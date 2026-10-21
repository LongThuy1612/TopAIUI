import type { Prisma } from '@prisma/client'

// What a tool card / list row renders (GET /api/tools, Saved AIs). The full row carries
// large JSON columns (nuxtTraffic, companyInfo, attributes…) and every locale's long
// description — the home page alone asks for 200 tools, and the SSR payload embeds the
// response a second time in the HTML — so lists select only this.
export const TOOL_CARD_SELECT = {
  id: true,
  slug: true,
  name: true,
  icon: true,
  logoUrl: true,
  screenshotUrl: true,
  website: true,
  pricingType: true,
  isFeatured: true,
  isAd: true,
  isVerified: true,
  averageRating: true,
  reviewCount: true,
  upvoteCount: true,
  collectionCount: true,
  createdAt: true,
  addedOn: true,
  categories: { select: { slug: true, icon: true, name: true, translations: { select: { locale: true, name: true } } } },
  tags: { select: { slug: true, translations: { select: { locale: true, name: true } } } },
  translations: { select: { locale: true, shortDesc: true } }
} satisfies Prisma.ToolSelect

type ToolCardRow = Prisma.ToolGetPayload<{ select: typeof TOOL_CARD_SELECT }>

// A selected row → the card shape, in one language (extra selected fields pass through).
export function toToolCard<T extends ToolCardRow>({ translations, categories, tags, ...tool }: T, locale: string) {
  const translation = pickByLocale(translations, locale)
  return {
    ...tool,
    icon: resolveToolImage(tool.icon),
    logoUrl: resolveToolImage(tool.logoUrl),
    screenshotUrl: resolveToolImage(tool.screenshotUrl),
    website: safeLinkUrl(tool.website),
    shortDesc: cleanText(translation?.shortDesc),
    categories: categories.map(c => ({ slug: c.slug, icon: c.icon, name: localizedName(c.translations, locale, c.name, c.slug) })),
    tags: tags.map(tg => ({ slug: tg.slug, name: localizedName(tg.translations, locale, null, tg.slug) }))
  }
}
