// Dashboard → My inquiries: the user's Contact-page messages and our replies,
// newest first. Also shows messages sent as a guest from the same address, but
// only once that address is confirmed — otherwise anyone could register someone
// else's email and read their messages.
export default defineEventHandler(async (event) => {
  const userId = await requireActiveUser(event)
  const me = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, emailVerified: true } })

  const items = await prisma.contactMessage.findMany({
    where: {
      OR: [
        { userId },
        ...(me.emailVerified ? [{ userId: null, email: me.email }] : [])
      ]
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { id: true, subject: true, message: true, status: true, reply: true, repliedAt: true, createdAt: true }
  })

  return { items }
})
