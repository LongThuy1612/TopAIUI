// Admin → Newsletter: the sending state and the last issues with their delivery counts.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const [issues, sentLastDay] = await Promise.all([
    prisma.newsletterIssue.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
    sentInLastDay()
  ])
  const counts = issues.length
    ? await prisma.newsletterDelivery.groupBy({ by: ['issueId', 'status'], where: { issueId: { in: issues.map(i => i.id) } }, _count: { _all: true } })
    : []
  const count = (issueId: string, status: string) => counts.find(c => c.issueId === issueId && c.status === status)?._count._all ?? 0
  return {
    smtpReady: !!useRuntimeConfig().smtpHost,
    dailyLimit: newsletterDailyLimit(),
    sentLastDay,
    limits: { tools: NEWSLETTER_LIMITS.tools, articles: NEWSLETTER_LIMITS.articles, perHour: NEWSLETTER_LIMITS.perRun },
    issues: issues.map(i => ({
      id: i.id,
      status: i.status,
      source: i.source,
      tools: i.toolIds.length,
      articles: i.articleIds.length,
      recipients: i.recipients,
      sent: count(i.id, 'SENT'),
      failed: count(i.id, 'FAILED'),
      createdAt: i.createdAt,
      finishedAt: i.finishedAt
    }))
  }
})
