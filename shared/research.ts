// Gói Research Plan (Dashboard → Website Insights / Social Listening): giá + hạn mức.
// Dùng chung cho modal Upgrade và API (server tạo giá Stripe từ đây, không tin client).
// Chữ hiển thị nằm trong i18n/locales/*.json, key "admin.upgradeModal".
// Hoàn toàn tách khỏi quảng cáo / promote (thanh toán một lần, shared/promote.ts).

export type ResearchPlanKey = 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'
export type BillingIntervalKey = 'MONTH' | 'YEAR'
export const RESEARCH_PLANS: ResearchPlanKey[] = ['STARTER', 'PROFESSIONAL', 'ENTERPRISE']
export const BILLING_INTERVALS: BillingIntervalKey[] = ['MONTH', 'YEAR']

export interface ResearchQuota {
  dataCredits: number // mỗi tháng — reset đầu mỗi tháng của kỳ, kể cả gói năm
  socialQueries: number // số query Social Listening đang hoạt động cùng lúc
  exportPerRequest: number // số dòng tối đa mỗi lần xuất
  exportPerMonth: number // tổng số dòng xuất mỗi tháng (reset cùng Data Credits)
}

// Bộ lọc trang Insights: basic = tháng, tìm kiếm, sắp xếp; advanced = + danh mục,
// khoảng lượt truy cập, khoảng tăng trưởng; full = + tỷ lệ thoát, thời gian xem, trang/lượt.
export type FilterLevel = 'basic' | 'advanced' | 'full'
// Thống kê trang Insights: basic = tổng quan tháng, top tăng trưởng, phân bố danh mục;
// deep = + xu hướng nhiều tháng, phân bố tăng trưởng, tăng trưởng theo danh mục.
export type StatsLevel = 'none' | 'basic' | 'deep'

export interface ResearchAccess { quota: ResearchQuota; filters: FilterLevel; stats: StatsLevel }

// Giá theo USD. Gói năm rẻ hơn 12 tháng khoảng 20%.
export const researchPlans: Record<ResearchPlanKey, ResearchAccess & { price: Record<BillingIntervalKey, number>; popular?: boolean }> = {
  STARTER: {
    price: { MONTH: 19, YEAR: 182 },
    quota: { dataCredits: 8_000, socialQueries: 10, exportPerRequest: 1_000, exportPerMonth: 10_000 },
    filters: 'advanced',
    stats: 'basic',
  },
  PROFESSIONAL: {
    price: { MONTH: 89, YEAR: 854 },
    quota: { dataCredits: 50_000, socialQueries: 10, exportPerRequest: 1_000, exportPerMonth: 10_000 },
    filters: 'advanced',
    stats: 'basic',
    popular: true,
  },
  ENTERPRISE: {
    price: { MONTH: 269, YEAR: 2582 },
    quota: { dataCredits: 200_000, socialQueries: 100, exportPerRequest: 5_000, exportPerMonth: 50_000 },
    filters: 'full',
    stats: 'deep',
  },
}

// Gói Free (mỗi tháng dương lịch).
export const freeAccess: ResearchAccess = {
  quota: { dataCredits: 100, socialQueries: 1, exportPerRequest: 100, exportPerMonth: 500 },
  filters: 'basic',
  stats: 'none',
}

export const accessOf = (plan: ResearchPlanKey | 'FREE'): ResearchAccess => (plan === 'FREE' ? freeAccess : researchPlans[plan])
export const FILTER_RANK: Record<FilterLevel, number> = { basic: 0, advanced: 1, full: 2 }
export const STATS_RANK: Record<StatsLevel, number> = { none: 0, basic: 1, deep: 2 }

// Trang public: khách chưa đăng nhập chỉ cuộn / phân trang được tới N tool đầu của một
// danh sách; Ranking (có số liệu truy cập) chỉ tới hạng N cho khách và gói Free.
export const PUBLIC_LIMITS = { guestListTools: 300, rankingFreeTools: 100 }

// Social Listening query: tối đa 5 từ khoá, mỗi từ 2–60 ký tự.
export const SOCIAL_QUERY_MAX_KEYWORDS = 5

export const isResearchPlan = (v: unknown): v is ResearchPlanKey => RESEARCH_PLANS.includes(v as ResearchPlanKey)
export const isBillingInterval = (v: unknown): v is BillingIntervalKey => BILLING_INTERVALS.includes(v as BillingIntervalKey)

// Thứ tự gói, để biết đổi gói là nâng hay hạ.
export const planRank = (plan: ResearchPlanKey | 'FREE') => (plan === 'FREE' ? 0 : RESEARCH_PLANS.indexOf(plan) + 1)
