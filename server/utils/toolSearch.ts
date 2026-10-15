import { Prisma } from '@prisma/client'

// Free-text search (?q=): tools whose name contains the text, or the domain of their
// website ("openai.com", or a pasted URL — "https://www.notion.so/pricing" looks for
// notion.so), or one of their tags (slug or translated name). Phrases with spaces don't
// look at websites; under 3 characters ("ai") only names count — every .ai website and
// half the tags would match.
//
// The ids of all matching tools (published or not — callers filter), as SQL to use in a
// WITH clause: a UNION of one query per kind of match, each served by its own index
// (trigram on name, website, tag slug and tag name; the tag join table's primary key).
// Written as `name ILIKE … OR website ILIKE … OR <tag filter>` instead, no index applies
// to the OR: Postgres reads the whole Tool table and runs the tag lookup for every row.
// And kept in the database on purpose: sending the ids back in as a parameter costs Prisma
// ~50 ms for a couple of thousand of them, ten times the query itself.
const MAX_MATCHING_TAGS = 500

export function searchMatchesSql(q: string): Prisma.Sql {
  const nameLike = `%${likeText(q)}%`
  const parts = [Prisma.sql`SELECT id FROM "Tool" WHERE name ILIKE ${nameLike}`]
  if (q.length >= 3) {
    if (!/\s/.test(q)) parts.push(Prisma.sql`SELECT id FROM "Tool" WHERE website ILIKE ${`%${likeText(websiteTerm(q))}%`}`)
    // The slug only for slug-like text ("chat gpt" → "chat-gpt"); anything else would have
    // to be stripped down to it ("_a_" → "a") and match unrelated tags.
    const tagSlug = q.toLowerCase().replace(/\s+/g, '-')
    const bySlug = /^[a-z0-9-]{3,}$/.test(tagSlug)
      ? Prisma.sql`(SELECT id FROM "Tag" WHERE slug LIKE ${`%${tagSlug}%`} LIMIT ${MAX_MATCHING_TAGS}) UNION `
      : Prisma.empty
    parts.push(Prisma.sql`SELECT tt."B" FROM "_ToolToTag" tt WHERE tt."A" IN (
      ${bySlug}(SELECT "tagId" FROM "TagTranslation" WHERE name ILIKE ${nameLike} LIMIT ${MAX_MATCHING_TAGS * 4})
    )`)
  }
  return Prisma.join(parts, ' UNION ')
}

// A pasted URL or domain → its host without "www."; other text as typed.
function websiteTerm(q: string): string {
  if (!q.includes('.')) return q
  try {
    return new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(q) ? q : `https://${q}`).hostname.replace(/^www\./, '') || q
  } catch {
    return q // not a URL
  }
}

// Whether a search finds at least one published tool (Popular searches only counts those).
export async function searchHasResults(q: string) {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    WITH matches AS (${searchMatchesSql(q)})
    SELECT t.id FROM matches m JOIN "Tool" t ON t.id = m.id
    WHERE t.status = 'PUBLISHED' AND t."deletedAt" IS NULL LIMIT 1`
  return rows.length > 0
}
