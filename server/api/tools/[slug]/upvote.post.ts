// POST /api/tools/<slug>/upvote { on?: boolean } → { upvoted, count }
// Votes for a tool (one vote per account), or takes the vote back. `on` sets the state
// (a double click can't count twice); without it the vote is toggled. Tool.upvoteCount
// moves with the row, in one transaction. Confirmed email addresses only.
export default defineEventHandler(async (event) => {
  const userId = await requireActiveUser(event)
  // Confirmed addresses only: otherwise anyone could register throwaway accounts and vote
  // a tool to the top of Top AI launches.
  const voter = await prisma.user.findUnique({ where: { id: userId }, select: { emailVerified: true } })
  if (!voter?.emailVerified) {
    throw createError({ statusCode: 403, statusMessage: 'Email not verified', message: 'Please confirm your email address to vote.' })
  }
  if (upvoteRateLimited(userId)) {
    throw createError({ statusCode: 429, statusMessage: 'Too many requests', message: 'Too many votes. Please wait a minute.' })
  }
  const slug = getRouterParam(event, 'slug') ?? ''
  const body = await readBody<{ on?: unknown }>(event).catch(() => null)
  const tool = await prisma.tool.findFirst({ where: { slug, status: 'PUBLISHED', deletedAt: null }, select: { id: true } })
  if (!tool) throw createError({ statusCode: 404, statusMessage: 'Tool not found' })

  return prisma.$transaction(async (tx) => {
    const key = { userId_toolId: { userId, toolId: tool.id } }
    const had = !!await tx.toolUpvote.findUnique({ where: key, select: { userId: true } })
    const want = typeof body?.on === 'boolean' ? body.on : !had
    if (want && !had) {
      // Two clicks at once: the second insert finds the row and changes nothing.
      const { count } = await tx.toolUpvote.createMany({ data: [{ userId, toolId: tool.id }], skipDuplicates: true })
      if (count) await tx.tool.update({ where: { id: tool.id }, data: { upvoteCount: { increment: 1 } } })
    } else if (!want && had) {
      const { count } = await tx.toolUpvote.deleteMany({ where: { userId, toolId: tool.id } })
      if (count) await tx.tool.update({ where: { id: tool.id }, data: { upvoteCount: { decrement: count } } })
    }
    const { upvoteCount } = await tx.tool.findUniqueOrThrow({ where: { id: tool.id }, select: { upvoteCount: true } })
    return { upvoted: want, count: Math.max(0, upvoteCount) }
  })
})
