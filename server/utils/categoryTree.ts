// The category tree for browsing, from Category.parentId as it is (read only): two levels.
// A top-level category (no parent) that has categories under it is a GROUP; everything
// below it — children and deeper levels — is listed flat under it. A top-level category
// with nothing under it has no group: the category page lists those under "All".
//
// Read on every tool list filtered by a category (a group's page shows the tools of the
// whole group), so it's cached; the tree only changes when categories are added.

interface Row { id: string; slug: string; parentId: string | null }

export interface CategoryTreeIndex {
  // slug → the slugs a filter on it covers: itself, plus everything below for a group.
  coverage: Map<string, string[]>
  // slug → its group's slug (a group maps to itself); missing for an ungrouped one.
  groupOf: Map<string, string>
  // group slug → the slugs listed under it
  childrenOf: Map<string, string[]>
  // top-level categories with nothing under them
  ungrouped: string[]
}

export const getCategoryTree = defineCachedFunction(async (): Promise<{ coverage: [string, string[]][]; groupOf: [string, string][]; childrenOf: [string, string[]][]; ungrouped: string[] }> => {
  const rows = await prisma.category.findMany({ select: { id: true, slug: true, parentId: true } })
  const byId = new Map<string, Row>(rows.map(r => [r.id, r]))
  // The top-level ancestor of a row (itself when it has no parent). A parent that no
  // longer exists, or a loop, ends the walk at the last row reached.
  const topOf = (row: Row) => {
    let current = row
    const seen = new Set<string>([row.id])
    while (current.parentId) {
      const parent = byId.get(current.parentId)
      if (!parent || seen.has(parent.id)) break
      seen.add(parent.id)
      current = parent
    }
    return current
  }
  const childrenOf = new Map<string, string[]>()
  for (const row of rows) {
    const top = topOf(row)
    if (top.id === row.id) continue
    const list = childrenOf.get(top.slug) ?? []
    list.push(row.slug)
    childrenOf.set(top.slug, list)
  }
  const groupOf = new Map<string, string>()
  const coverage = new Map<string, string[]>()
  for (const [group, children] of childrenOf) {
    groupOf.set(group, group)
    for (const child of children) groupOf.set(child, group)
    coverage.set(group, [group, ...children])
  }
  // Alone at the top: no parent — or a parent that no longer exists — and nothing below.
  const ungrouped = rows.filter(r => topOf(r).id === r.id && !childrenOf.has(r.slug)).map(r => r.slug)
  // Plain arrays: the cache stores JSON.
  return { coverage: [...coverage], groupOf: [...groupOf], childrenOf: [...childrenOf], ungrouped }
}, { name: 'category-tree', maxAge: 600, swr: true, getKey: () => 'all', shouldBypassCache: () => import.meta.dev })

// The lookup maps, kept for a minute: every tool list filtered by a category asks for
// them, and rebuilding ~2,000 entries per request is wasted work.
let memo: { at: number; index: CategoryTreeIndex } | null = null
export async function categoryTreeIndex(): Promise<CategoryTreeIndex> {
  if (memo && Date.now() - memo.at < 60_000 && !import.meta.dev) return memo.index
  const raw = await getCategoryTree()
  const index = { coverage: new Map(raw.coverage), groupOf: new Map(raw.groupOf), childrenOf: new Map(raw.childrenOf), ungrouped: raw.ungrouped }
  memo = { at: Date.now(), index }
  return index
}

// The category slugs a "?category=<slug>" filter covers: a group's whole tree, else itself.
export async function categoryFilterSlugs(slug: string): Promise<string[]> {
  return (await categoryTreeIndex()).coverage.get(slug) ?? [slug]
}
