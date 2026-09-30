export interface CategoryRef {
  slug: string
  name: string
  icon: string
}

export interface Category extends CategoryRef {
  description?: string | null
  isFeatured: boolean
  viewCount: number
  count: number
}

export interface TagRef {
  slug: string
  name: string
}

export interface MetaOption {
  value: string
  count: number
}

export interface ToolTranslationEntry {
  locale: string
  shortDesc: string | null
  description: string | null
  whatIs: string | null
  howToUse: string | null
  coreFeatures: string[]
  useCases: string[]
  isManualOverride: boolean
}

export interface Faq {
  question: string
  answer: string
}

export interface PricingPlan {
  name: string
  price: string
  period: string
  features: string[]
}

export interface Review {
  rating: number
  comment: string | null
  createdAt: string
  userName: string | null
}

export interface Tool {
  id: string
  slug: string
  name: string
  status: 'PENDING' | 'PUBLISHED' | 'CANCELED'
  logoUrl?: string
  screenshotUrl?: string
  videoUrl?: string
  images?: unknown
  affiliateUrl?: string
  couponCode?: string
  pricingType: 'FREE' | 'FREEMIUM' | 'PAID'
  website?: string
  twitterUrl?: string
  discordUrl?: string
  productHuntUrl?: string
  socialLinks?: unknown
  isFeatured: boolean
  isJustLaunched: boolean
  isVerified: boolean
  isFreeTool: boolean
  isAd: boolean
  adPriority: number
  rejectionReason?: string
  monthlyTraffic?: string
  monthlyVisits: number
  collectionCount: number
  impressions: number
  clicksOrganic: number
  clicksPaid: number
  domainAuthority: number
  viewCount: number
  clickCount: number
  averageRating: number
  reviewCount: number
  reviewScore: number
  ratingCount: number
  upvoteCount: number
  trafficRank: number
  last1MonthGrowth: number
  last3MonthGrowth: number
  last6MonthGrowth: number
  nuxtTraffic?: unknown
  companyInfo?: unknown
  attributes?: unknown
  ownerId?: string
  isApproved?: boolean
  addedOn?: string
  region?: string | null
  source?: string | null
  monthlyRevenue?: number
  createdAt: string
  updatedAt: string
  categories?: CategoryRef[]

  // Locale-aware fields — resolved server-side from ToolTranslation for the requested locale
  shortDesc?: string | null
  description?: string | null
  whatIs?: string | null
  howToUse?: string | null
  coreFeatures?: string[]
  useCases?: string[]

  // Only populated by the admin tool-detail endpoint
  translations?: ToolTranslationEntry[]

  // Only populated by the tool-detail endpoint
  tags?: TagRef[]
  faqs?: Faq[]
  pricingPlans?: PricingPlan[]
  analytics?: ToolAnalytics | null
}

export interface ToolAnalytics {
  monthlyVisits: number | null
  growthPct: number | null
  avgVisitDuration: number | null // seconds
  pagesPerVisit: number | null
  bounceRatePct: number | null
  chart: { month: string; visits: number }[]
  sources: { name: string; pct: number }[]
  keywords: { keyword: string; volume: number; type: 'organic' | 'paid' }[]
  geography: { code: string; numeric: number | null; pct: number }[] // code: ISO alpha-2, numeric: world map id
  ranking: {
    global: number | null
    country: string | null // ISO alpha-2
    countryRank: number | null
    category: string | null
    categoryRank: number | null
  }
  yearFounded: string | null
  employeeRange: string | null
  apps: { title: string; icon: string | null; store: 'googleplay' | 'appstore'; rating: number | null; ratingCount: number }[]
}

export interface ToolsResponse {
  items: Tool[]
  total: number
  page: number
  pageCount: number
}

export interface ReviewsResponse {
  items: Review[]
  total: number
  page: number
  pageCount: number
}

export interface AdminToolsResponse {
  items: Tool[]
}

export type UserRole = 'USER' | 'MANAGER' | 'ADMIN'

export interface AdminUser {
  id: string
  email: string
  name: string | null
  role: UserRole
  isBanned: boolean
  emailVerified: boolean
  createdAt: string
  updatedAt: string
  _count: { promoteOrders: number }
}

export interface AdminUsersResponse {
  items: AdminUser[]
  total: number
}
