type CategoryWithCount = {
  slug: string
  name: string
  icon: string
  parentId: string | null
  isFeatured: boolean
  viewCount: number
  count: bigint
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const locale = String(query.locale ?? 'en')

  const rows = await prisma.$queryRaw<CategoryWithCount[]>`
    SELECT c."slug", COALESCE(ct."name", c."name", c."slug") AS "name", c."icon", c."parentId", c."isFeatured", c."viewCount",
           COUNT(t."id") FILTER (WHERE t."status" = 'PUBLISHED') AS count
    FROM "Category" c
    LEFT JOIN "CategoryTranslation" ct ON ct."categoryId" = c."id" AND ct."locale" = ${locale}
    LEFT JOIN "_ToolToCategory" tc ON tc."A" = c."id"
    LEFT JOIN "Tool" t ON t."id" = tc."B"
    GROUP BY c."id", ct."name"
    ORDER BY "name" ASC
  `

  return rows.map((c) => ({ ...c, count: Number(c.count) }))
})
