export const MAX_TOOL_CATEGORIES = 5

// Every category and every tool's category slugs — for data built over all tools at once
// (Website Insights, Social Listening). Cached once for every language: names in one
// language come from categoryNames(). Two queries without parameters: loaded through
// the relation instead, Prisma binds every tool id as its own parameter, and PostgreSQL
// takes at most 32,767 — past that many tools the query fails.
export const loadToolCategories = memoryCached('tool categories', async () => {
  const [categories, links] = await Promise.all([
    prisma.category.findMany({ select: { id: true, slug: true, name: true, translations: { select: { locale: true, name: true } } } }),
    // Unordered: sorting 70k rows in the database cost more than the lists below.
    prisma.$queryRaw<{ category: string; tool: string }[]>`SELECT "A" AS category, "B" AS tool FROM "_ToolToCategory"`
  ])
  const slugOf = new Map(categories.map(c => [c.id, c.slug]))
  const idsByTool: Record<string, string[]> = {}
  for (const link of links) (idsByTool[link.tool] ??= []).push(link.category)
  // tool id → its category slugs, in category id order (a stable order for every tool).
  const slugsByTool: Record<string, string[]> = {}
  for (const [tool, ids] of Object.entries(idsByTool)) {
    const slugs = ids.sort().map(id => slugOf.get(id)).filter((slug): slug is string => !!slug)
    if (slugs.length) slugsByTool[tool] = slugs
  }
  return {
    categories: categories.map(c => ({ slug: c.slug, name: c.name, translations: c.translations })),
    slugsByTool
  }
}, 10 * 60 * 1000)

// Category slug → its name in one language (the translation, else the default name).
export async function categoryNames(locale: string) {
  const { categories } = await loadToolCategories()
  return new Map(categories.map(c => [c.slug, cleanText(pickByLocale(c.translations, locale)?.name) ?? cleanText(c.name) ?? c.slug]))
}

// Validates a list of category slugs and returns the Prisma relation update that
// replaces the tool's categories with exactly that list. Forms only send
// `categorySlugs` when the user actually changed the selection, so a save that
// doesn't touch categories never drops ones the form didn't load.
export async function categoriesSetData(value: unknown) {
  const bad = (message: string) => createError({ statusCode: 400, statusMessage: message, message })
  if (!Array.isArray(value)) throw bad('Invalid categories.')
  const slugs = [...new Set(value.filter((s): s is string => typeof s === 'string').map(s => s.trim()).filter(Boolean))]
  if (slugs.length > MAX_TOOL_CATEGORIES) throw bad(`At most ${MAX_TOOL_CATEGORIES} categories.`)

  const found = await prisma.category.findMany({ where: { slug: { in: slugs } }, select: { slug: true } })
  if (found.length !== slugs.length) throw bad('Unknown category.')
  return { set: slugs.map(slug => ({ slug })) }
}
