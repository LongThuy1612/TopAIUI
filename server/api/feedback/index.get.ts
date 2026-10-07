// The logged-in user's own feedback, newest first. The admin's internal note
// is never included.
export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ['USER', 'MANAGER', 'ADMIN'])

  const items = await prisma.feedback.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      type: true,
      message: true,
      status: true,
      attachmentName: true,
      attachmentType: true,
      attachmentUrl: true,
      createdAt: true
    }
  })

  return {
    items: items.map(({ attachmentUrl, ...f }) => ({ ...f, hasAttachment: !!attachmentUrl }))
  }
})
