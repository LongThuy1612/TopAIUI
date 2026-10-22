// GET /llms.txt — a plain-text map of the site for AI assistants and LLM crawlers
// (https://llmstxt.org): what the site is, its main pages and its biggest categories.
// The same for everyone, so cached for an hour.
export default defineCachedEventHandler(async (event) => {
  const site = String(useRuntimeConfig().public.siteUrl || 'https://www.topaicollection.com').replace(/\/$/, '')
  const published = { status: 'PUBLISHED', deletedAt: null } as const
  const [toolCount, categories] = await Promise.all([
    prisma.tool.count({ where: published }),
    prisma.category.findMany({
      where: { tools: { some: published } },
      orderBy: { tools: { _count: 'desc' } },
      take: 40,
      select: { slug: true, name: true, translations: { where: { locale: 'en' }, select: { locale: true, name: true } }, _count: { select: { tools: { where: published } } } }
    })
  ])
  const clean = (name: string) => name.replace(/^[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}️‍\s]+/u, '').trim() || name

  const lines = [
    '# TopAICollection',
    '',
    `> A directory of ${toolCount.toLocaleString('en-US')} AI tools and websites, updated daily. Each tool page has a description, pricing, features, user reviews, monthly website traffic and alternatives. Tools are grouped by category and ranked by traffic, growth and ratings.`,
    '',
    '## Main pages',
    '',
    `- [All AI tools](${site}/category/all): every tool, filterable by category and pricing`,
    `- [New AI tools](${site}/new): the latest tools added to the directory`,
    `- [AI tool ranking](${site}/ranking): tools ranked by monthly traffic and growth`,
    `- [Most saved AI tools](${site}/most-saved): the tools users save most`,
    `- [Free AI tools](${site}/category/all?pricing=FREE): tools with a free plan`,
    `- [GPT Store](${site}/gpts): custom ChatGPT GPTs by category`,
    `- [AI News](${site}/ai-news): news and guides about AI tools`,
    '',
    '## Top categories',
    '',
    ...categories.map(c => `- [${clean(localizedName(c.translations, 'en', c.name, c.slug))}](${site}/category/${c.slug}): ${c._count.tools} tools`),
    '',
    '## Optional',
    '',
    `- [Sitemap](${site}/sitemap_index.xml): every tool, category and article page`,
    `- [Submit an AI tool](${site}/submit): add a tool to the directory`,
    `- [Contact](${site}/contact)`,
    ''
  ]
  setResponseHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  return lines.join('\n')
}, {
  name: 'llms-txt',
  maxAge: 3600,
  swr: true,
  getKey: () => 'llms',
  shouldBypassCache: () => import.meta.dev
})
