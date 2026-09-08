type CategoryWithCount = {
  slug: string
  name: string
  icon: string
  parentId: string | null
  isFeatured: boolean
  viewCount: number
  count: bigint
}

export default defineEventHandler(async () => {
  const rows = await prisma.$queryRaw<CategoryWithCount[]>`
    SELECT c."slug", c."name", c."icon", c."parentId", c."isFeatured", c."viewCount",
           COUNT(t."id") FILTER (WHERE t."status" = 'PUBLISHED') AS count
    FROM "Category" c
    LEFT JOIN "_CategoryToTool" ct ON ct."A" = c."id"
    LEFT JOIN "Tool" t ON t."id" = ct."B"
    GROUP BY c."id"
    ORDER BY c."name" ASC
  `

  return rows.map((c) => ({ ...c, count: Number(c.count) }))
})
