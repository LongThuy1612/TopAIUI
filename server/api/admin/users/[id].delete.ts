// Delete a user. Soft delete — their orders and reviews stay for accounting —
// and the email (and linked Google account) is released so the address can
// register again.
export default defineEventHandler(async (event) => {
  const me = await requireRole(event, ['ADMIN'])
  const id = getRouterParam(event, 'id')!

  const target = await prisma.user.findFirst({ where: { id, deletedAt: null } })
  if (!target) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  if (target.id === me.id) throw badRequest('You cannot delete your own account')
  if (target.role === 'ADMIN' && !target.isBanned && await countOtherActiveAdmins(target.id) === 0) {
    throw badRequest('At least one active admin is required')
  }

  // A deleted account must not keep paying for a Research Plan.
  await cancelSubscriptionsForDeletedUser(id)

  // Its guest posts / link inserts still waiting leave the review queue (nobody to publish
  // them for any more).
  await prisma.postSubmission.updateMany({
    where: { userId: id, status: { in: OPEN_STATUSES } },
    data: { status: 'WITHDRAWN', adminNote: 'Account deleted', reviewedAt: new Date() }
  })

  await removeUserSaves(id)
  await removeUserUpvotes(id)

  await prisma.user.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      isBanned: true,
      email: `deleted-${Date.now()}-${target.email}`,
      password: null,
      googleId: null,
      passwordResetToken: null,
      verificationToken: null
    }
  })
  return { ok: true }
})
