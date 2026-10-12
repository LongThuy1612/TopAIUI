import type { SitemapUrlInput } from '@nuxtjs/sitemap'
import { defaultLocale, locales } from '../../../i18n/settings'

// Dynamic pages for the sitemap (static pages such as /about, /ai-news or /gpts are
// added by @nuxtjs/sitemap itself, in every language). English lives at /…, other
// languages at /vi/…; each URL lists its language versions (hreflang) so search
// engines treat them as one page. Only versions with their own content are listed:
// a tool in the languages it has a description in, articles and GPTs in English
// (their pages in other languages point their canonical at English).

const prefixed = (code: string, path: string) => (code === defaultLocale ? path : `/${code}${path}`)

function inLanguages(path: string, codes: readonly string[], lastmod?: Date): SitemapUrlInput[] {
  const alternatives = [
    ...codes.map(code => ({ hreflang: code, href: prefixed(code, path) })),
    ...(codes.includes(defaultLocale) ? [{ hreflang: 'x-default', href: path }] : [])
  ]
  return codes.map(code => ({ loc: prefixed(code, path), lastmod, alternatives, _i18nTransform: false }))
}

export default defineSitemapEventHandler(async () => {
  const [tools, translated, categories, articles, gpts] = await Promise.all([
    prisma.tool.findMany({
      where: { status: 'PUBLISHED', deletedAt: null },
      select: { id: true, slug: true, updatedAt: true }
    }),
    // Same rule as the tool page (server/api/tools/[slug].get.ts → availableLocales).
    prisma.toolTranslation.findMany({
      where: {
        locale: { not: defaultLocale },
        tool: { status: 'PUBLISHED', deletedAt: null },
        OR: [
          { AND: [{ shortDesc: { not: null } }, { shortDesc: { not: '' } }] },
          { AND: [{ description: { not: null } }, { description: { not: '' } }] }
        ]
      },
      select: { toolId: true, locale: true }
    }),
    prisma.category.findMany({ select: { slug: true, updatedAt: true } }),
    prisma.article.findMany({ where: { status: 'PUBLISHED', externalUrl: null }, select: { slug: true, updatedAt: true } }),
    prisma.gpt.findMany({ where: { status: 'PUBLISHED' }, select: { slug: true, updatedAt: true } })
  ])

  const supported = new Set<string>(locales)
  const toolLocales = new Map<string, string[]>()
  for (const row of translated) {
    if (!supported.has(row.locale)) continue
    const list = toolLocales.get(row.toolId) ?? [defaultLocale]
    if (!list.includes(row.locale)) list.push(row.locale)
    toolLocales.set(row.toolId, list)
  }

  return [
    ...tools.flatMap(tool => inLanguages(`/tools/${tool.slug}`, toolLocales.get(tool.id) ?? [defaultLocale], tool.updatedAt)),
    // Category pages are fully translated (interface, names, tool cards).
    ...categories.flatMap(category => inLanguages(`/category/${category.slug}`, locales, category.updatedAt)),
    ...articles.flatMap(article => inLanguages(`/ai-news/${article.slug}`, [defaultLocale], article.updatedAt)),
    ...gpts.flatMap(gpt => inLanguages(`/gpts/${gpt.slug}`, [defaultLocale], gpt.updatedAt))
  ]
})
