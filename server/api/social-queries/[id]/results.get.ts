// GET /api/social-queries/<id>/results?page= — matching posts, newest first, with their
// tool. Opening page 1 marks the query as seen (its "new" count resets). A paused query
// shows nothing until it is active again.
export default defineEventHandler(async (event) => {
  const userId = await requireActiveUser(event)
  const q = await ownQuery(userId, getRouterParam(event, 'id') ?? '')
  if (!q.active) {
    throw createError({ statusCode: 403, statusMessage: 'Query paused', message: 'Resume this query to see its results.' })
  }
  if (!(await coveredQueryIds(userId)).has(q.id)) {
    throw createError({ statusCode: 403, statusMessage: 'Over plan limit', message: 'Your plan covers fewer active queries — pause or delete one, or upgrade, to see this one.', data: { reason: 'queries' } })
  }
  const page = Math.max(1, Number(getQuery(event).page) || 1)
  const limit = 20
  const where = queryWhere(q.keywords)
  const [total, posts] = await Promise.all([
    prisma.toolSocialFeed.count({ where }),
    prisma.toolSocialFeed.findMany({
      where,
      orderBy: [{ publishedAt: { sort: 'desc', nulls: 'last' } }, { id: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, platform: true, title: true, description: true, thumbnailUrl: true, videoUrl: true,
        creatorName: true, creatorHandle: true, publishedAt: true, views: true, likes: true, comments: true, shares: true, createdAt: true,
        stat: { select: { toolSlug: true, toolName: true } }
      }
    })
  ])
  const seenBefore = q.lastViewedAt ?? q.createdAt
  if (page === 1) await prisma.socialQuery.update({ where: { id: q.id }, data: { lastViewedAt: new Date() } })
  return {
    query: { id: q.id, name: q.name, keywords: q.keywords },
    total,
    page,
    pageCount: Math.ceil(total / limit),
    items: posts.map(p => ({
      id: p.id,
      platform: p.platform,
      title: p.title,
      description: p.description,
      thumbnailUrl: safeHttpUrl(p.thumbnailUrl),
      url: safeHttpUrl(p.videoUrl),
      creator: p.creatorName ?? p.creatorHandle,
      publishedAt: p.publishedAt,
      // BigInt doesn't go through JSON.
      views: Number(p.views), likes: Number(p.likes), comments: Number(p.comments), shares: Number(p.shares),
      tool: { slug: p.stat.toolSlug, name: p.stat.toolName },
      isNew: p.createdAt > seenBefore
    }))
  }
})
