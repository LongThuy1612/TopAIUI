// The logged-in user's ad campaigns (Dashboard → Advertise AI).
export default defineEventHandler(async (event) => {
  const userId = requireUser(event)
  const campaigns = await prisma.adCampaign.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, tier: true, status: true, pausedByAdmin: true, landingUrl: true, pendingLandingUrl: true,
      rejectionReason: true, clicksPurchased: true, clicksRemaining: true, clicks: true, impressions: true,
      createdAt: true, approvedAt: true,
      tool: { select: { id: true, name: true, slug: true, logoUrl: true, website: true } }
    }
  })
  return {
    items: campaigns.map(c => ({ ...c, tool: { ...c.tool, logoUrl: resolveToolImage(c.tool.logoUrl), website: safeHttpUrl(c.tool.website) } }))
  }
})
