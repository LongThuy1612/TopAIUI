export default defineEventHandler(async () => {
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } })

  const withCounts = await Promise.all(
    categories.map(async (c) => ({
      slug: c.slug,
      name: c.name,
      icon: c.icon,
      parentId: c.parentId,
      isFeatured: c.isFeatured,
      viewCount: c.viewCount,
      count: await prisma.tool.count({ where: { status: 'PUBLISHED', categories: { some: { slug: c.slug } } } })
    }))
  )

  return withCounts
})
