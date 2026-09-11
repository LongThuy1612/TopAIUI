export interface CategoryRef {
  slug: string
  name: string
  icon: string
}

export interface Category extends CategoryRef {
  isFeatured: boolean
  viewCount: number
  count: number
}

export interface TagRef {
  slug: string
  name: string
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
  toolifyUrl?: string
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
  nuxtTraffic?: unknown
  companyInfo?: unknown
  attributes?: unknown
  ownerId?: string
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

  // Only populated by the tool-detail endpoint
  tags?: TagRef[]
  faqs?: Faq[]
  pricingPlans?: PricingPlan[]
  reviews?: Review[]
}

export interface ToolsResponse {
  items: Tool[]
  total: number
  page: number
  pageCount: number
}

export interface AdminToolsResponse {
  items: Tool[]
}
