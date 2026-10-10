// One published GPT, with its optional longer text rendered to HTML (shared/markdown.ts:
// raw HTML escaped) and a few others from the same category.
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') ?? ''
  const gpt = await prisma.gpt.findFirst({ where: { slug, status: 'PUBLISHED' }, select: { ...gptCardSelect, content: true, updatedAt: true } })
  if (!gpt) throw createError({ statusCode: 404, statusMessage: 'GPT not found' })
  const { content, ...rest } = gpt
  const related = await prisma.gpt.findMany({
    where: { status: 'PUBLISHED', category: gpt.category, slug: { not: slug } },
    orderBy: { publishedAt: 'desc' },
    take: 6,
    select: gptCardSelect
  })
  return { ...rest, html: content ? articleRenderer().render(content) : '', related }
})
