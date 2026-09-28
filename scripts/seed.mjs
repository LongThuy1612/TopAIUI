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

// Tools without analytics, so the empty state stays visible locally.
const analyticsSkip = ['apiscout']

// Fake ToolAnalyticsData in the same shape as the old topaicollection rows.
// Seeded from the slug so re-running the seed gives the same numbers.
function fakeAnalytics(slug) {
  let s = [...slug].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)
  const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32)

  const months = ['2026-03-01', '2026-04-01', '2026-05-01', '2026-06-01', '2026-07-01', '2026-08-01']
  let visits = 20000 + rand() * 2000000
  const trend = months.map(() => (visits *= 0.85 + rand() * 0.35))
  const trafficVisits = Object.fromEntries(months.map((m, i) => [m, trend[i]]))

  const raw = { Direct: rand() * 60 + 20, Search: rand() * 30, Referral: rand() * 15, Social: rand() * 10, Others: rand() * 5 }
  const total = Object.values(raw).reduce((a, b) => a + b, 0)
  const trafficSources = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Math.round((v / total) * 10000) / 100]))

  const last = trend[trend.length - 1]
  const prev = trend[trend.length - 2]
  return {
    monthlyVisits: last,
    trafficVisits,
    trafficSources,
    engagement: { bounceRate: 0.2 + rand() * 0.5, timeOnSite: 60 + rand() * 600, pagePerVisit: 1.5 + rand() * 7 },
    growthMetrics: { trend, change: (last - prev) / prev },
    similarSites: [],
    geography: { data: [], filters: {} }
  }
}

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

  const analyticsTools = await prisma.tool.findMany({ where: { slug: { notIn: analyticsSkip } }, select: { slug: true } })
  for (const { slug } of analyticsTools) {
    const data = fakeAnalytics(slug)
    await prisma.toolAnalyticsData.upsert({ where: { toolSlug: slug }, update: data, create: { toolSlug: slug, ...data } })
  }
  console.log(`Upserted fake analytics for ${analyticsTools.length} tools (${analyticsSkip.join(', ')} left empty).`)

  console.log('Seed complete.')
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
