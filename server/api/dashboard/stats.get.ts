// Counters for the Dashboard home tiles. An admin gets the whole site's numbers (the tiles
// open the admin pages); everyone else gets their own.
//   tools: pending / published   ads: running (ACTIVE) / stopped (PAUSED, EXHAUSTED)
//   posts: pending (incl. changes requested) / published   gpts: pending / published
export default defineEventHandler(async (event) => {
  // requireRole also rejects banned / deleted accounts whose token is still valid.
  const { id: userId, role } = await requireRole(event, ['USER', 'MANAGER', 'ADMIN'])
  const admin = role === 'ADMIN'
  if (!admin) await ensureGptsForPaidOrders(userId)

  const count = (rows: { status: string; _count: { _all: number } }[], statuses: string[]) =>
    rows.filter(r => statuses.includes(r.status)).reduce((n, r) => n + r._count._all, 0)

  const [tools, ads, posts, gpts] = await Promise.all([
    prisma.tool.groupBy({ by: ['status'], where: { deletedAt: null, ...(admin ? {} : { ownerId: userId }) }, _count: { _all: true } }),
    prisma.adCampaign.groupBy({ by: ['status'], where: admin ? {} : { userId }, _count: { _all: true } }),
    prisma.postSubmission.groupBy({ by: ['status'], where: admin ? {} : { userId }, _count: { _all: true } }),
    prisma.gpt.groupBy({ by: ['status'], where: admin ? {} : { ownerId: userId }, _count: { _all: true } })
  ])
  return {
    scope: admin ? 'site' : 'mine',
    tools: { pending: count(tools, ['PENDING']), published: count(tools, ['PUBLISHED']) },
    ads: { running: count(ads, ['ACTIVE']), stopped: count(ads, ['PAUSED', 'EXHAUSTED']) },
    posts: { pending: count(posts, ['PENDING', 'CHANGES_REQUESTED']), published: count(posts, ['PUBLISHED']) },
    gpts: { pending: count(gpts, ['PENDING']), published: count(gpts, ['PUBLISHED']) }
  }
})
