import type { SitemapUrlInput } from '@nuxtjs/sitemap'

export default defineSitemapEventHandler(async () => {
  const [tools, categories, articles, gpts] = await Promise.all([
    prisma.tool.findMany({
      where: { status: 'PUBLISHED', deletedAt: null },
      select: { slug: true, updatedAt: true }
    }),
    prisma.category.findMany({ select: { slug: true, updatedAt: true } }),
    prisma.article.findMany({ where: { status: 'PUBLISHED' }, select: { slug: true, updatedAt: true } }),
    prisma.gpt.findMany({ where: { status: 'PUBLISHED' }, select: { slug: true, updatedAt: true } })
  ])

  const toolUrls: SitemapUrlInput[] = tools.map((tool) => ({
    loc: `/tools/${tool.slug}`,
    lastmod: tool.updatedAt
  }))

  const categoryUrls: SitemapUrlInput[] = categories.map((category) => ({
    loc: `/category/${category.slug}`,
    lastmod: category.updatedAt
  }))

  const articleUrls: SitemapUrlInput[] = [
    { loc: '/ai-news' },
    ...articles.map((article) => ({ loc: `/ai-news/${article.slug}`, lastmod: article.updatedAt }))
  ]

  const gptUrls: SitemapUrlInput[] = [
    { loc: '/gpts' },
    ...gpts.map((gpt) => ({ loc: `/gpts/${gpt.slug}`, lastmod: gpt.updatedAt }))
  ]

  return [...toolUrls, ...categoryUrls, ...articleUrls, ...gptUrls]
})
