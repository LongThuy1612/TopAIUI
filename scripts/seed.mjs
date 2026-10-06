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

// TFives = real data read from capterra.com/p/10265222/TFives/ on 2026-10-06 (brand-new tool,
// no reviews yet). Keepfy only carries the shape of the fields a new tool leaves empty
// (pricingPlans, ratingBreakdown, subRatings, features, reviews, faqs); long text trimmed with '...'.
const capterraTools = [
  {
    capterraId: 10265222,
    slug: 'TFives',
    url: 'https://www.capterra.com/p/10265222/TFives/',
    name: 'TFives',
    categoryName: 'Audit Software',
    categoryUrl: 'https://www.capterra.com/audit-software/',
    lastUpdated: new Date('2026-10-06'),
    description: 'TFives is AI governance and regulatory compliance software for pharmaceutical and life sciences companies. ComplianceIQ, the core compliance management platform, applies the right regulations, controls, and evidence to every AI workflow, from design to retirement. Role-based workflows serve regulatory affairs, quality, clinical and R&D, medical affairs and safety, and commercial teams. Before an AI agent acts on a high-consequence decision, TFives checks that it is allowed within its approved use. Allowed actions proceed and are recorded; others are stopped and sent to a human reviewer. Every decision is logged with the rule applied, the source evidence, and who approved it, and can be exported as a signed ALCOA+ inspection package. PromoIQ checks pharma promotional content against FDA and FTC rules before MLR review. TFives supports governance, risk and compliance (GRC) programs and works alongside RIM and eQMS systems. SOC 2 compliant; 2026 Fierce AI Innovation Awards finalist.',
    usedFor: ['Audit'],
    ratingOverall: null,
    reviewCount: 0,
    startingPrice: 'Contact vendor for pricing',
    freeTrial: true,
    freeVersion: false,
    pricingPlans: [],
    alternatives: [
      { name: 'Netwrix Access Analyzer', rating: 4.5, reviewCount: 15, startingPrice: 'Contact vendor for pricing', positivePct: 100 },
      { name: 'ChemicalSafety', rating: 4.7, reviewCount: 3, startingPrice: '$29.00 Per User, Per Month', positivePct: 100 },
      { name: 'FORM OpX', rating: 4.5, reviewCount: 36, startingPrice: '$30.00 Per User, Per Month', positivePct: 92 },
      { name: 'VelocityEHS', rating: 4.5, reviewCount: 166, startingPrice: 'Contact vendor for pricing', positivePct: 95 }
    ],
    headToHead: { name: 'ComplianceHR', rating: 4.8, reviewCount: 8, startingPrice: '$2500 Other, Per Year' },
    support: ['Email/Help Desk', 'FAQs/Forum', 'Knowledge Base', 'Phone Support', '24/7 (Live rep)', 'Chat'],
    training: ['In Person', 'Live Online', 'Webinars', 'Documentation', 'Videos'],
    deployment: ['Web', 'Android', 'iPhone/iPad'],
    typicalUsers: ['Freelancers', 'Small businesses', 'Mid size businesses', 'Enterprises'],
    features: [],
    reviews: [],
    faqs: [],
    sourceUrl: 'https://www.capterra.com/p/10265222/TFives/',
    scrapedAt: new Date('2026-10-06T00:00:00.000Z')
  },
  {
    capterraId: 248340,
    slug: 'Keepfy',
    url: 'https://www.capterra.com/p/248340/Keepfy/',
    name: 'Keepfy',
    ratingOverall: 4.7,
    reviewCount: 13,
    startingPrice: 'R$149.90 Per User, Per Month',
    pricingPlans: [{ name: 'Basic', price: 'R$149.90', unit: 'Per User, Per Month' }],
    ratingBreakdown: { 5: 9, 4: 4, 3: 0, 2: 0, 1: 0 },
    subRatings: { easeOfUse: 4.6, valueForMoney: 4.7, customerService: 4.6, features: 4.6 },
    features: [
      { name: 'Activity Dashboard', description: 'Dashboard to view the status of ongoing processes, identify current incidents and track past activities' },
      { name: 'Work Order Management', description: 'Creating, assign, and track jobs and/or tasks for work orders' }
    ],
    reviews: [
      {
        reviewer: 'Luciano O.',
        role: 'Gestor de Manutenção',
        industry: 'Health, Wellness and Fitness',
        title: 'Excelente Sistema',
        date: '2025-06-11',
        overallRating: 5.0,
        easeOfUse: 5.0,
        features: 5.0,
        customerService: 5.0,
        likelihoodToRecommend: 10,
        pros: 'Sistema eficiente de gestão, ...',
        cons: 'uma sugestão de melhoria, ...',
        switchedFrom: 'Leankeep',
        reviewSource: 'Vendor Referred - Incentive Offered'
      }
    ],
    faqs: [{ section: 'Overview', question: 'Which roles and teams benefit most from Keepfy?', answer: null }],
    sourceUrl: 'https://www.capterra.com/p/248340/Keepfy/'
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

  const analyticsTools = await prisma.tool.findMany({ where: { slug: { notIn: analyticsSkip } }, select: { slug: true } })
  for (const { slug } of analyticsTools) {
    const data = fakeAnalytics(slug)
    await prisma.toolAnalyticsData.upsert({ where: { toolSlug: slug }, update: data, create: { toolSlug: slug, ...data } })
  }
  console.log(`Upserted fake analytics for ${analyticsTools.length} tools (${analyticsSkip.join(', ')} left empty).`)

  for (const tool of capterraTools) {
    await prisma.capterraTool.upsert({ where: { capterraId: tool.capterraId }, update: tool, create: tool })
  }
  console.log(`Upserted ${capterraTools.length} Capterra tools.`)

  console.log('Seed complete.')
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
