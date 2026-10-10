// Giá + cấu trúc của khu vực "Promote" (5 trang). Dùng chung cho các trang
// và API checkout (server tính lại giá từ đây).
// Toàn bộ chữ hiển thị nằm trong i18n/locales/*.json, key "promote".

export const SITE_NAME = 'TopAICollection'
export const CONTACT_EMAIL = 'business@example.com' // TODO: email thật

/* ------------------------------------------------------------------ */
/* Dùng chung                                                          */
/* ------------------------------------------------------------------ */

// Thay bằng số liệu thật của site bạn. `key` → promote.stats.<key>
export const stats = [
  { value: '—', key: 'pageViews', icon: 'eye', color: '#f97316' },
  { value: '—', key: 'monthlyVisits', icon: 'users', color: '#7c4dff' },
  { value: '—', key: 'subscribers', icon: 'mail', color: '#2563eb' },
  { value: '—', key: 'desktopUsers', icon: 'monitor', color: '#7c4dff' },
  { value: '—', key: 'avgTime', icon: 'clock', color: '#2563eb' },
]

export type ServiceKey = 'submit' | 'advertise' | 'guest-post' | 'update' | 'submit-gpt'

// `i18n` → promote.services.<i18n>.title / .desc
export const services: { key: ServiceKey; i18n: string; to: string; hot?: boolean }[] = [
  { key: 'submit', i18n: 'submit', to: '/submit' },
  { key: 'advertise', i18n: 'advertise', to: '/advertise', hot: true },
  { key: 'guest-post', i18n: 'guestPost', to: '/post-or-insert' },
  { key: 'update', i18n: 'update', to: '/update-ai' },
  { key: 'submit-gpt', i18n: 'submitGpt', to: '/submit-gpt' },
]

/* ------------------------------------------------------------------ */
/* Submit AI                                                           */
/* ------------------------------------------------------------------ */

export const submitAi = {
  price: 99,
  modes: ['auto', 'manual'] as const,
}

/* ------------------------------------------------------------------ */
/* Advertise AI                                                        */
/* ------------------------------------------------------------------ */

export type AdTier = 'STANDARD' | 'FEATURED'
export const AD_TIERS: AdTier[] = ['STANDARD', 'FEATURED']

// TODO: đặt giá thật. costPerClick tính theo USD. Featured = 2× Standard.
const standardPackages = [
  { clicks: 500, costPerClick: 0.2 },
  { clicks: 1000, costPerClick: 0.18 },
  { clicks: 5000, costPerClick: 0.16 },
  { clicks: 10000, costPerClick: 0.14 },
  { clicks: 20000, costPerClick: 0.12 },
  { clicks: 50000, costPerClick: 0.1 },
]

export const advertise = {
  // Mỗi tier một bảng giá; số dư click của 2 tier tách riêng (xem server/utils/ads.ts).
  packages: {
    STANDARD: standardPackages,
    FEATURED: standardPackages.map(p => ({ clicks: p.clicks, costPerClick: +(p.costPerClick * 2).toFixed(2) })),
  } as Record<AdTier, { clicks: number; costPerClick: number }[]>,
  slotPositions: [1, 4, 12], // trang Home: vị trí (tính từ 1) của các ô sponsor trong danh sách
  bannerAfterRow: 3, // các trang list khác: 1 banner, nằm sau hàng thứ 3
  // Mỗi ô quảng cáo: xác suất lấy campaign Featured (còn lại là Standard), khi cả hai
  // nhóm đều có campaign. Trong mỗi nhóm, trọng số = căn bậc hai số click còn lại.
  featuredShare: 0.7,
  featuredTypeIndex: 1, // promote.advertise.types[1] là gói nổi bật (= tier FEATURED)
  // Bảng minh hoạ — số liệu mẫu, không phải thật
  reportExampleRows: [['Example AI', '1,200', '500', '1,700', '2,100', '60', '850,000']],
}

/* ------------------------------------------------------------------ */
/* Guest Post / Link Insert                                            */
/* ------------------------------------------------------------------ */

export const CREDIT_PRICE = 100 // USD / credit
export const BULK_DISCOUNT = { minExclusive: 10, percent: 5 } // >10 credits giảm 5%
export const MAX_CREDITS_PER_ORDER = 1000

export const creditSubtotal = (credits: number) => credits * CREDIT_PRICE
export const hasBulkDiscount = (credits: number) => credits > BULK_DISCOUNT.minExclusive
export const creditTotal = (credits: number) =>
  hasBulkDiscount(credits) ? +(creditSubtotal(credits) * (1 - BULK_DISCOUNT.percent / 100)).toFixed(2) : creditSubtotal(credits)

export const guestPost = {
  packages: [1, 2, 3, 10], // số credits; ghi chú ở promote.guestPost.packageNotes (cùng thứ tự)
  strongNotes: [0, 1], // chỉ số các dòng in đậm trong promote.guestPost.notes
  // Giá credit và yêu cầu bài (kiểm tra cả ở form lẫn server — server/utils/articles.ts).
  credits: { GUEST_POST: 2, LINK_INSERT: 1 } as Record<'GUEST_POST' | 'LINK_INSERT', number>,
  minWords: 800,
  maxLinks: 2, // link ra ngoài trong một guest post
  // rel của link trong bài: 'dofollow' (như trang bán đang hứa) hoặc 'sponsored' (an toàn
  // SEO theo chính sách Google). Áp dụng lúc hiển thị, nên đổi ở đây là mọi bài đổi theo.
  linkRel: 'dofollow' as 'dofollow' | 'sponsored',
}
export type PostSubmissionType = 'GUEST_POST' | 'LINK_INSERT'

/* ------------------------------------------------------------------ */
/* Update AI                                                           */
/* ------------------------------------------------------------------ */

export const updateAi = {
  price: 49,
  lockedFields: [9], // chỉ số trong promote.update.fields — hiển thị gạch, không cho đổi (Website URL)
  strongNotes: [2],
}

/* ------------------------------------------------------------------ */
/* Submit GPT                                                          */
/* ------------------------------------------------------------------ */

export const submitGpt = {
  price: 29,
}
