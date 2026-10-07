// The logged-in user's own profile + invoice details (dashboard → Payment & Invoice).
export default defineEventHandler(async (event) => {
  const userId = requireUser(event)

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      name: true,
      company: true,
      country: true,
      phone: true,
      city: true,
      state: true,
      zip: true,
      address: true,
      vatNumber: true,
      isBanned: true,
      deletedAt: true
    }
  })
  if (!user || user.isBanned || user.deletedAt) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const { isBanned: _banned, deletedAt: _deleted, ...profile } = user
  return profile
})
