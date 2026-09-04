import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const categories = [
  { slug: 'coding-development', name: 'Coding & Development', icon: '💻' },
  { slug: 'writing-editing', name: 'Writing & Editing', icon: '✍️' },
  { slug: 'image-generation-editing', name: 'Image Generation & Editing', icon: '🖼️' },
  { slug: 'video-animation', name: 'Video & Animation', icon: '🎬' },
  { slug: 'office-productivity', name: 'Office & Productivity', icon: '🗂️' },
  { slug: '3d-design', name: '3D & Design', icon: '🧊' }
]

const tools = [
  { slug: 'codebeacon', name: 'CodeBeacon', categorySlug: 'coding-development', pricingType: 'PAID', isFeatured: true, status: 'PUBLISHED' },
  { slug: 'apiscout', name: 'ApiScout', categorySlug: 'coding-development', pricingType: 'FREE', status: 'PUBLISHED' },
  { slug: 'draftwell', name: 'DraftWell', categorySlug: 'writing-editing', pricingType: 'FREEMIUM', isFeatured: true, status: 'PUBLISHED' },
  { slug: 'pixelforge', name: 'PixelForge', categorySlug: 'image-generation-editing', pricingType: 'FREEMIUM', isFeatured: true, status: 'PUBLISHED' },
  { slug: 'reeltrack', name: 'ReelTrack', categorySlug: 'video-animation', pricingType: 'FREEMIUM', status: 'PUBLISHED' },
  { slug: 'briefbox', name: 'BriefBox', categorySlug: 'office-productivity', pricingType: 'FREE', isFeatured: true, status: 'PUBLISHED' },
  // Left as 'PENDING' on purpose so the admin queue isn't empty on first login.
  { slug: 'nightowl-demo', name: 'NightOwl (demo)', categorySlug: 'office-productivity', pricingType: 'FREE', status: 'PENDING' },
  {
    slug: 'vista-3d',
    name: 'Vista3D',
    categorySlug: '3d-design',
    pricingType: 'FREEMIUM',
    website: 'https://example.com/vista3d',
    isFeatured: true,
    isVerified: true,
    status: 'PUBLISHED',
    screenshotUrl: 'https://placehold.co/1280x720/2f66f5/ffffff?text=Vista3D+Workspace',
    monthlyVisits: 42000,
    domainAuthority: 38,
    averageRating: 4.6,
    reviewCount: 128,
    upvoteCount: 340
  }
]

async function seed() {
  console.log('Seeding database...')

  for (const cat of categories) {
    await prisma.category.upsert({ where: { slug: cat.slug }, update: cat, create: cat })
  }
  console.log(`Upserted ${categories.length} categories.`)

  for (const { categorySlug, ...tool } of tools) {
    await prisma.tool.upsert({
      where: { slug: tool.slug },
      update: { ...tool, categories: { set: [{ slug: categorySlug }] } },
      create: { ...tool, categories: { connect: [{ slug: categorySlug }] } }
    })
  }
  console.log(`Upserted ${tools.length} tools (1 left pending for the admin queue).`)

  console.log('Seed complete.')
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
