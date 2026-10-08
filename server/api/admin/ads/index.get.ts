// Ad campaigns for admins. ?filter=review (default): new campaigns and landing URL
// changes waiting for a decision, oldest first; ?filter=all: everything, newest first.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const review = String(getQuery(event).filter ?? 'review') === 'review'
  const items = await prisma.adCampaign.findMany({
    where: review ? { OR: [{ status: 'PENDING_REVIEW' }, { pendingLandingUrl: { not: null } }] } : {},
    orderBy: { updatedAt: review ? 'asc' : 'desc' },
    take: 200,
    select: {
      id: true, tier: true, status: true, pausedByAdmin: true, landingUrl: true, pendingLandingUrl: true,
      rejectionReason: true, clicksPurchased: true, clicksRemaining: true, clicks: true, impressions: true,
      createdAt: true, updatedAt: true,
      tool: { select: { id: true, name: true, slug: true, logoUrl: true, website: true } },
      user: { select: { email: true } }
    }
  })
  return {
    items: items.map(c => ({ ...c, tool: { ...c.tool, logoUrl: resolveToolImage(c.tool.logoUrl), website: safeHttpUrl(c.tool.website) } }))
  }
})
