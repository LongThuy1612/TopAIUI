function slugify(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { name, categorySlug, website, pricingType } = body || {}

  if (!name || !categorySlug) {
    throw createError({ statusCode: 400, statusMessage: 'name and categorySlug are required' })
  }

  const slug = slugify(name)
  const existing = await prisma.tool.findUnique({ where: { slug } })
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'A tool with a similar name already exists' })
  }

  const tool = await prisma.tool.create({
    data: {
      slug,
      name,
      website,
      pricingType: pricingType || 'FREEMIUM',
      status: 'PENDING', // always lands in the moderation queue, never auto-published
      categories: { connect: { slug: categorySlug } }
    }
  })

  return { ok: true, slug: tool.slug }
})
