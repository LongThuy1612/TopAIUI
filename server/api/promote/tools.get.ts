// GET /api/promote/tools?q=chat  → [{ id, name, slug, logo }]
// Tìm tool đã có trong directory cho ô chọn tool ở trang Advertise / Update AI.
export default defineEventHandler(async (event) => {
  const q = String(getQuery(event).q ?? '').trim()
  if (q.length < 2) return []

  const tools = await prisma.tool.findMany({
    where: { status: 'PUBLISHED', deletedAt: null, name: { contains: q, mode: 'insensitive' } },
    orderBy: { name: 'asc' },
    take: 10,
    select: { id: true, name: true, slug: true, logoUrl: true, icon: true }
  })

  return tools.map(t => ({ id: t.id, name: t.name, slug: t.slug, logo: resolveToolImage(t.logoUrl) || resolveToolImage(t.icon) || undefined }))
})
