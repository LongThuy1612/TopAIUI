import type { Prisma } from '@prisma/client'

// Review moderation. New reviews start PENDING; only APPROVED ones are shown
// on the tool page and counted in Tool.averageRating / Tool.reviewCount.
export const REVIEW_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const
export type ReviewStatus = (typeof REVIEW_STATUSES)[number]

// A user may have at most one review per tool in these statuses; a REJECTED
// one doesn't count, so they can write a new one.
export const ACTIVE_REVIEW_STATUSES: ReviewStatus[] = ['PENDING', 'APPROVED']

export const REVIEW_COMMENT_MAX = 10000

// Transaction-scoped Postgres advisory lock, released on commit/rollback.
// Serialises "check then write" sequences that a unique index can't express
// (one active review per user+tool) and the rating recalculation per tool.
export async function lockReviewKey(tx: Prisma.TransactionClient, key: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('review'), hashtext(${key}))`
}

export function findOtherActiveReview(tx: Prisma.TransactionClient, userId: string, toolId: string, excludeId?: string) {
  return tx.review.findFirst({
    where: { toolId, userId, status: { in: ACTIVE_REVIEW_STATUSES }, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true }
  })
}

export function alreadyReviewedError() {
  return createError({ statusCode: 409, statusMessage: 'You have already reviewed this tool', message: 'You have already reviewed this tool' })
}

// Recompute a tool's rating aggregates from its approved reviews. Call after
// any change that can move a review into or out of APPROVED. The lock makes
// concurrent recalculations run one after another, so the last one to finish
// always sees every committed change and never overwrites with stale numbers.
export async function recalcToolRating(toolId: string) {
  await prisma.$transaction(async (tx) => {
    await lockReviewKey(tx, `tool:${toolId}`)
    const agg = await tx.review.aggregate({
      where: { toolId, status: 'APPROVED' },
      _avg: { rating: true },
      _count: { _all: true }
    })
    await tx.tool.update({
      where: { id: toolId },
      data: {
        averageRating: Math.round((agg._avg.rating ?? 0) * 10) / 10,
        reviewCount: agg._count._all
      }
    })
  })
}
