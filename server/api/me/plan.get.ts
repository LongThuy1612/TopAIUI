// The logged-in user's Research Plan, what it allows, and this month's quota (sidebar
// box, Upgrade modal, Payment & Invoice, Insights, Social Listening).
export default defineEventHandler(async (event) => {
  const userId = await requireActiveUser(event)
  const [sub, usage, access, activeQueries] = await Promise.all([
    currentSubscription(userId),
    currentUsage(userId),
    currentAccess(userId),
    prisma.socialQuery.count({ where: { userId, active: true } })
  ])
  return {
    plan: access.plan,
    interval: sub?.interval ?? null,
    status: sub?.status ?? null,
    currentPeriodEnd: sub?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
    // A fake (dev) subscription has no Stripe billing account to open.
    canManageBilling: !!sub && !isFakeSubscription(sub.stripeSubscriptionId),
    filters: access.filters,
    stats: access.stats,
    usage: {
      periodEnd: usage.periodEnd,
      dataCredits: { used: usage.dataCreditsUsed, limit: usage.dataCreditsLimit },
      // Active queries right now (pausing / deleting one frees its slot).
      socialQueries: { used: activeQueries, limit: access.quota.socialQueries },
      exportRows: { used: usage.exportRowsUsed, limit: usage.exportRowsLimit, perRequest: access.quota.exportPerRequest }
    }
  }
})
