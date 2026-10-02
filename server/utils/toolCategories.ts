export const MAX_TOOL_CATEGORIES = 5

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
