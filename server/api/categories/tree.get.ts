import { Prisma } from '@prisma/client'

// GET /api/categories/tree?locale= — the category page's sidebar: groups with the
// categories under them, and the top-level categories without a group (shown as an
// "Other" group, `ungroupedCount` its distinct tools), from server/utils/categoryTree.ts.
// Only categories with published tools; a group's count is its distinct tools (one tool
// in two of its categories counts once). `totalTools`: every published tool.
// Cached per language; counts can lag a few minutes.
interface Node { slug: string; name: string; icon: string; count: number }

// "other-tools" → "Other Tools", for the few categories without a name.

export default defineCachedEventHandler(async (event) => {
  const locale = normalizeLocale(getQuery(event).locale)
  const tree = await categoryTreeIndex()

  const published = Prisma.sql`t.status = 'PUBLISHED' AND t."deletedAt" IS NULL`
  const groupSlugs = [...tree.coverage.keys()]
  // The ungrouped ones counted together as one more group (a key no slug can have).
  const OTHER = ' other'
  const pairs = [
    ...groupSlugs.flatMap(g => tree.coverage.get(g)!.map(slug => [slug, g] as const)),
    ...tree.ungrouped.map(slug => [slug, OTHER] as const)
  ]
  const [direct, grouped, totalTools] = await Promise.all([
    prisma.$queryRaw<{ slug: string; count: number }[]>`
      SELECT c.slug, count(*)::int AS count
      FROM "_ToolToCategory" tc
      JOIN "Category" c ON c.id = tc."A"
      JOIN "Tool" t ON t.id = tc."B" AND ${published}
      GROUP BY c.slug`,
    pairs.length
      ? prisma.$queryRaw<{ slug: string; count: number }[]>`
          SELECT m.grp AS slug, count(DISTINCT tc."B")::int AS count
          FROM unnest(${pairs.map(p => p[0])}::text[], ${pairs.map(p => p[1])}::text[]) AS m(slug, grp)
          JOIN "Category" c ON c.slug = m.slug
          JOIN "_ToolToCategory" tc ON tc."A" = c.id
          JOIN "Tool" t ON t.id = tc."B" AND ${published}
          GROUP BY m.grp`
      : Promise.resolve([]),
    prisma.tool.count({ where: { status: 'PUBLISHED', deletedAt: null } })
  ])
  const directCount = new Map(direct.map(r => [r.slug, r.count]))
  const groupCount = new Map(grouped.map(r => [r.slug, r.count]))

  const wanted = new Set<string>([...directCount.keys(), ...groupCount.keys()])
  const rows = await prisma.category.findMany({
    where: { slug: { in: [...wanted] } },
    select: { slug: true, name: true, icon: true, translations: { select: { locale: true, name: true } } }
  })
  const info = new Map(rows.map(r => [r.slug, {
    name: localizedName(r.translations, locale, r.name, r.slug),
    icon: r.icon
  }]))
  const node = (slug: string, count: number): Node | null => {
    const i = info.get(slug)
    return i && count > 0 ? { slug, name: i.name, icon: i.icon, count } : null
  }
  const byCount = (a: Node, b: Node) => b.count - a.count || a.name.localeCompare(b.name)
  // Catch-all groups ("other-tools", "other-1"…) go last, whatever their size — just
  // before the ungrouped categories, which the pages list after every group.
  const isCatchAll = (n: Node) => /^others?(-|$)/.test(n.slug)
  const groupOrder = (a: Node, b: Node) => Number(isCatchAll(a)) - Number(isCatchAll(b)) || byCount(a, b)

  const groups = groupSlugs.flatMap((g) => {
    const head = node(g, groupCount.get(g) ?? 0)
    if (!head) return []
    const children = tree.childrenOf.get(g)!
      .map(slug => node(slug, directCount.get(slug) ?? 0))
      .filter((n): n is Node => !!n)
      .sort(byCount)
    return [{ ...head, children }]
  }).sort(groupOrder)
  const ungrouped = tree.ungrouped
    .map(slug => node(slug, directCount.get(slug) ?? 0))
    .filter((n): n is Node => !!n)
    .sort(byCount)

  return { groups, ungrouped, ungroupedCount: groupCount.get(OTHER) ?? 0, totalTools }
}, { name: 'api-categories-tree', maxAge: 300, swr: true, getKey: event => normalizeLocale(getQuery(event).locale), shouldBypassCache: () => import.meta.dev })
