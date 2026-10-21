// One tag for its /tag/<slug> page: its name in the requested language and how many
// published tools carry it. 404 when no published tool does.
export default defineCachedEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') ?? ''
  const locale = String(getQuery(event).locale ?? 'en')
  const tag = await prisma.tag.findUnique({
    where: { slug },
    select: {
      slug: true,
      translations: { select: { locale: true, name: true } },
      _count: { select: { tools: { where: { status: 'PUBLISHED', deletedAt: null } } } }
    }
  })
  if (!tag || !tag._count.tools) throw createError({ statusCode: 404, statusMessage: 'Tag not found' })
  return {
    slug: tag.slug,
    name: localizedName(tag.translations, locale, null, tag.slug),
    count: tag._count.tools
  }
}, { name: 'api-tag', maxAge: 300, swr: true, shouldBypassCache: () => import.meta.dev })
