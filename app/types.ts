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
  step1?: boolean
  step2?: boolean // user-submitted tool: listing content is ready for review
  aiSync?: number | null // crawler AI job: null none, 0 queued, 1 done, -1 failed, 2 invalid
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

  // User-submitted tools (admin + owner detail endpoints)
  owner?: { id: string; email: string; name: string | null } | null
  submitMode?: 'auto' | 'manual'
  duplicateOf?: { id: string; name: string; website: string | null } | null // admin endpoint only
  updateRequest?: ToolUpdateRequest | null // paid update of a published tool (owner: latest; admin: open one)
  canEdit?: boolean // owner endpoint only

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
  /** A guest reached PUBLIC_LIMITS.guestListTools: the rest needs a login. */
  loginRequired?: boolean
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

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface AdminReview {
  id: string
  rating: number
  comment: string | null
  status: ReviewStatus
  locale: string
  createdAt: string
  userInfo: { name?: string; email?: string } | null
  tool: { id: string; name: string; slug: string }
  user: { id: string; name: string | null; email: string } | null
}

export interface AdminReviewsResponse {
  items: AdminReview[]
  total: number
  pendingCount: number
  page: number
  pageCount: number
}

// Proposed changes of a paid "Update AI" (see server/utils/toolUpdates.ts).
export interface ToolUpdateChanges {
  fields: {
    name?: string
    logoUrl?: string | null
    images?: string[]
    screenshotUrl?: string | null
    twitterUrl?: string | null
    discordUrl?: string | null
    pricingType?: 'FREE' | 'FREEMIUM' | 'PAID'
  }
  categorySlugs?: string[]
  content?: {
    shortDesc: string | null
    description: string | null
    whatIs: string | null
    howToUse: string | null
    coreFeatures: string[]
    useCases: string[]
  }
}

export interface ToolUpdateRequest {
  id: string
  status: 'DRAFT' | 'SUBMITTED' | 'APPLIED' | 'REJECTED'
  changes: ToolUpdateChanges | null
  rejectionReason?: string | null
  submittedAt?: string | null
  reviewedAt?: string | null
}

export interface RankingItem {
  rank: number
  slug: string
  name: string
  logoUrl: string | null
  visits: number
  /** Percent change for the selected period (1-month unless sorting by 3/6-month growth). */
  growth: number | null
  /** Visits from the selected country/source (equals visits otherwise). */
  score: number
  /** Share 0-100 of the selected country/source, null without one. */
  share: number | null
  categories: { slug: string; name: string }[]
}

export interface RankingResponse {
  /** Month the traffic data is for, YYYY-MM. */
  month: string | null
  /** Growth is only ranked for tools with at least this many visits in the base month. */
  minGrowthBase: number
  items: RankingItem[]
  total: number
  page: number
  pageCount: number
  /** The list stops at this rank for this user (guest / Free plan); null = no limit. */
  limitedTo?: number | null
}

export interface RankingFilters {
  month: string | null
  categories: { slug: string; name: string; count: number }[]
  countries: { code: string; count: number }[]
  sources: { name: string; count: number }[]
}

// Dashboard → Feedback (server/utils/feedback.ts).
export type FeedbackType = 'FEATURE' | 'ISSUE' | 'BILLING' | 'OTHER'
export type FeedbackStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'

export interface MyFeedback {
  id: string
  type: FeedbackType
  message: string
  status: FeedbackStatus
  hasAttachment: boolean
  attachmentName: string | null
  attachmentType: string | null
  createdAt: string
}

export interface AdminFeedback extends MyFeedback {
  adminNote: string | null
  attachmentSize: number | null
  locale: string | null
  userAgent: string | null
  resolvedAt: string | null
  user: { id: string; name: string | null; email: string }
}

export interface AdminFeedbackResponse {
  items: AdminFeedback[]
  total: number
  newCount: number
  page: number
  pageCount: number
}

// Pay-per-click ads (server/utils/ads.ts).
export type AdTier = 'STANDARD' | 'FEATURED'
export type AdCampaignStatus = 'PENDING_REVIEW' | 'ACTIVE' | 'PAUSED' | 'EXHAUSTED' | 'REJECTED'
export type AdPlacement = 'home' | 'today' | 'new' | 'most-featured' | 'category' | 'tool' | 'ranking' | 'bar'

export interface AdSlot {
  campaignId: string
  tier: AdTier
  clickUrl: string
  tool: Pick<Tool, 'id' | 'slug' | 'name' | 'pricingType'> & {
    logoUrl?: string
    isAd: true
    shortDesc: string | null
    categories: { slug: string; name: string }[]
    tags: { slug: string; name: string }[]
  }
}

export interface AdCampaign {
  id: string
  tier: AdTier
  status: AdCampaignStatus
  pausedByAdmin: boolean
  landingUrl: string | null
  pendingLandingUrl: string | null
  rejectionReason: string | null
  clicksPurchased: number
  clicksRemaining: number
  clicks: number
  impressions: number
  createdAt: string
  tool: { id: string; name: string; slug: string; logoUrl: string | null; website: string | null }
}

export interface AdminAdCampaign extends AdCampaign {
  updatedAt: string
  user: { email: string }
}
