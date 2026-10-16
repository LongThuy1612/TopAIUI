import { Prisma } from '@prisma/client'

// Upvotes (POST /api/tools/<slug>/upvote). Tool.upvoteCount is kept in step with the
// ToolUpvote rows as they change; reconcileUpvoteCounts repairs any drift nightly.

// A deleted or banned account's votes stop counting (like its saves, toolSaves.ts).
export async function removeUserUpvotes(userId: string) {
  await prisma.$transaction(async (tx) => {
    const rows = await tx.toolUpvote.findMany({ where: { userId }, select: { toolId: true } })
    if (!rows.length) return
    await tx.toolUpvote.deleteMany({ where: { userId } })
    await tx.$executeRaw`UPDATE "Tool" SET "upvoteCount" = GREATEST("upvoteCount" - 1, 0) WHERE "id" IN (${Prisma.join(rows.map(r => r.toolId))})`
  })
}

// Nightly (server/tasks/tools/stats-cleanup.ts): set every count that differs from its rows.
export async function reconcileUpvoteCounts() {
  return prisma.$executeRaw`
    UPDATE "Tool" t SET "upvoteCount" = coalesce(v.n, 0)
    FROM (
      SELECT t2.id, count(u."toolId")::int AS n
      FROM "Tool" t2 LEFT JOIN "ToolUpvote" u ON u."toolId" = t2.id
      WHERE t2."upvoteCount" > 0 OR u."toolId" IS NOT NULL
      GROUP BY t2.id
    ) v
    WHERE t.id = v.id AND t."upvoteCount" <> coalesce(v.n, 0)`
}

// Vote changes per account per minute: clicking up and down only writes so often.
const CHANGES_PER_MINUTE = 30
const recent = new Map<string, number[]>()
export function upvoteRateLimited(userId: string) {
  const now = Date.now()
  const list = (recent.get(userId) ?? []).filter(t => now - t < 60_000)
  if (recent.size > 50_000) recent.clear()
  if (list.length >= CHANGES_PER_MINUTE) { recent.set(userId, list); return true }
  recent.set(userId, [...list, now])
  return false
}
