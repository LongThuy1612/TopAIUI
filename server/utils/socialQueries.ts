import type { Prisma } from '@prisma/client'
import { SOCIAL_QUERY_MAX_KEYWORDS } from '#shared/research'

// Social Listening queries (model SocialQuery): a saved topic of 1–5 keywords, matched
// against the crawled social posts (ToolSocialFeed title / description, case-insensitive,
// any keyword). Plans cap how many are ACTIVE at once (Free 1, Starter / Professional 10,
// Enterprise 100); pausing or deleting frees a slot. No Data Credits are spent.

const bad = (message: string) => createError({ statusCode: 400, statusMessage: message, message })

export function cleanQueryInput(input: { name?: unknown; keywords?: unknown }, partial = false) {
  const out: { name?: string; keywords?: string[] } = {}
  if (input.name !== undefined || !partial) {
    const name = typeof input.name === 'string' ? input.name.trim() : ''
    if (!name || name.length > 80) throw bad('Give the query a name (up to 80 characters).')
    out.name = name
  }
  if (input.keywords !== undefined || !partial) {
    const raw = Array.isArray(input.keywords) ? input.keywords : []
    const keywords = [...new Set(raw.filter((k): k is string => typeof k === 'string').map(k => k.trim().replace(/\s+/g, ' ')).filter(Boolean))]
    if (!keywords.length) throw bad('Add at least one keyword.')
    if (keywords.length > SOCIAL_QUERY_MAX_KEYWORDS) throw bad(`A query has at most ${SOCIAL_QUERY_MAX_KEYWORDS} keywords.`)
    if (keywords.some(k => k.length < 2 || k.length > 60)) throw bad('Each keyword is 2–60 characters.')
    out.keywords = keywords
  }
  return out
}

// Runs `fn` with this user's queries locked, after checking one more active query fits
// the plan — so two parallel requests can't both take the last slot.
export async function withActiveSlot<T>(userId: string, fn: (tx: Prisma.TransactionClient) => Promise<T>) {
  const { quota } = await currentAccess(userId)
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext(${`social-queries:${userId}`}))) AS l`
    const active = await tx.socialQuery.count({ where: { userId, active: true } })
    if (active >= quota.socialQueries) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Query limit reached',
        message: quota.socialQueries
          ? `Your plan tracks up to ${quota.socialQueries} active ${quota.socialQueries === 1 ? 'query' : 'queries'}. Pause or delete one, or upgrade.`
          : 'Social Listening queries need a higher plan.',
        data: { reason: 'queries', limit: quota.socialQueries }
      })
    }
    return fn(tx)
  })
}

// Posts matching any keyword (title or description).
export function queryWhere(keywords: string[]): Prisma.ToolSocialFeedWhereInput {
  return {
    OR: keywords.flatMap(k => [
      { title: { contains: k, mode: 'insensitive' as const } },
      { description: { contains: k, mode: 'insensitive' as const } }
    ])
  }
}

// Active queries the plan covers: the oldest `limit` of them. After a downgrade a user can
// have more active queries than the plan allows — the newer ones are kept but show no
// results until a slot frees up (pause / delete) or the plan is raised.
export async function coveredQueryIds(userId: string) {
  const { quota } = await currentAccess(userId)
  const rows = await prisma.socialQuery.findMany({
    where: { userId, active: true },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    take: quota.socialQueries,
    select: { id: true }
  })
  return new Set(rows.map(r => r.id))
}

export async function ownQuery(userId: string, id: string) {
  const q = await prisma.socialQuery.findFirst({ where: { id, userId } })
  if (!q) throw createError({ statusCode: 404, statusMessage: 'Query not found' })
  return q
}
