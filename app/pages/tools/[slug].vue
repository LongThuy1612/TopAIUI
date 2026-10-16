<script setup lang="ts">
import type { Review, ReviewsResponse, Tool, ToolsResponse } from '~/types'

const { t, te, locale } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const slug = computed(() => String(route.params.slug))

// Tool and its first page of reviews don't depend on each other — fetch both at once.
const [{ data: tool, error }, { data: reviewsRes }] = await Promise.all([
  useFetch<Tool>(() => `/api/tools/${slug.value}`, {
    query: computed(() => ({ locale: locale.value }))
  }),
  useFetch<ReviewsResponse>(() => `/api/tools/${slug.value}/reviews`, {
    query: { page: 1, limit: 10, sort: 'newest' }
  })
])

if (error.value) {
  // Only a real "no such tool" is a 404; a DB / API failure must not tell
  // crawlers the page is gone (and a 503 keeps it out of the page cache).
  const notFound = error.value.statusCode === 404
  throw createError({ statusCode: notFound ? 404 : 503, statusMessage: notFound ? 'Tool not found' : 'Service unavailable' })
}

const category = computed(() => tool.value?.categories?.[0])

// Slides come from `images` (entries are a string or { url }) when it has any;
// otherwise fall back to a single screenshotUrl, then the logo.
const heroImages = computed<string[]>(() => {
  const t = tool.value
  if (!t) return []
  const fromImages = (Array.isArray(t.images) ? t.images : [])
    .map(item => (typeof item === 'string' ? item : (item as { url?: string } | null)?.url))
    .filter((url): url is string => !!url)
  if (fromImages.length) return [...new Set(fromImages)]
  const fallback = t.screenshotUrl || t.logoUrl
  return fallback ? [fallback] : []
})

const slider = ref<HTMLElement | null>(null)
const activeSlide = ref(0)

function onSliderScroll() {
  const el = slider.value
  if (el) activeSlide.value = Math.round(el.scrollLeft / el.clientWidth)
}

function goToSlide(index: number) {
  const el = slider.value
  if (!el) return
  const next = Math.min(Math.max(index, 0), heroImages.value.length - 1)
  el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' })
}

// Mouse drag to swipe; touch keeps the browser's native swipe.
const isDragging = ref(false)
// Snap stays off until the smooth scroll after a drag settles, otherwise the
// browser re-snaps to the nearest image mid-animation.
const snapDisabled = ref(false)
let dragStartX = 0
let dragStartScroll = 0

function onDragStart(e: PointerEvent) {
  if (e.pointerType !== 'mouse' || e.button !== 0 || heroImages.value.length < 2 || !slider.value) return
  isDragging.value = true
  snapDisabled.value = true
  dragStartX = e.clientX
  dragStartScroll = slider.value.scrollLeft
  slider.value.setPointerCapture(e.pointerId)
}

function onDragMove(e: PointerEvent) {
  if (!isDragging.value || !slider.value) return
  slider.value.scrollLeft = dragStartScroll - (e.clientX - dragStartX)
}

function onDragEnd(e: PointerEvent) {
  if (!isDragging.value || !slider.value) return
  isDragging.value = false
  slider.value.releasePointerCapture(e.pointerId)
  // Past 15% of the width counts as a swipe to the next/previous image.
  const delta = dragStartX - e.clientX
  const threshold = slider.value.clientWidth * 0.15
  const start = Math.round(dragStartScroll / slider.value.clientWidth)
  goToSlide(delta > threshold ? start + 1 : delta < -threshold ? start - 1 : start)
  setTimeout(() => { snapDisabled.value = false }, 500)
}

// Below the fold: still server-rendered, but lazy so client-side navigation
// shows the tool without waiting for this list.
const { data: alternativesRes } = useFetch<ToolsResponse>('/api/tools', {
  query: computed(() => ({ category: category.value?.slug, limit: 6, locale: locale.value })),
  lazy: true
})
// Tools shown in an ad slot on this page aren't repeated among the alternatives.
const alternatives = computed(() => (alternativesRes.value?.items ?? [])
  .filter(item => item.slug !== slug.value && !adSlots.value.some(ad => ad.tool.slug === item.slug)))

// Two sponsored banners, never this tool's own ad: above the reviews, and over the
// alternatives (other tools of the kind the visitor is looking at).
const { slots: adSlots } = useAdSlots('tool', { exclude: () => slug.value, positions: [1], limit: 2 })
const adBanner = computed(() => adSlots.value[0])
const alternativesAd = computed(() => adSlots.value[1])

const initials = computed(() => tool.value?.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'AI')

const reviewsSort = ref<'newest' | 'oldest'>('newest')
const reviewsPage = ref(1)
const reviewsLoading = ref(false)

const reviews = ref<Review[]>(reviewsRes.value?.items ?? [])
const reviewsTotal = ref(reviewsRes.value?.total ?? 0)
const reviewsHasMore = computed(() => reviews.value.length < reviewsTotal.value)

async function fetchReviews(page: number, sort: 'newest' | 'oldest') {
  reviewsLoading.value = true
  try {
    const res = await $fetch<ReviewsResponse>(`/api/tools/${slug.value}/reviews`, { query: { page, limit: 10, sort } })
    reviewsTotal.value = res.total
    return res.items
  } finally {
    reviewsLoading.value = false
  }
}

async function loadMoreReviews() {
  if (reviewsLoading.value || !reviewsHasMore.value) return
  const nextPage = reviewsPage.value + 1
  const sort = reviewsSort.value
  const items = await fetchReviews(nextPage, sort)
  // Sort changed while this page was loading: changeReviewsSort already
  // replaced the list, so these (old-order) reviews don't belong in it.
  if (sort !== reviewsSort.value) return
  reviews.value.push(...items)
  reviewsPage.value = nextPage
  // Pages are cached separately, so total can be ahead of what's left (a review
  // was rejected meanwhile) — an empty page means the end, or the button would
  // stay up and keep fetching empty pages.
  if (!items.length) reviewsTotal.value = reviews.value.length
}

async function changeReviewsSort(sort: 'newest' | 'oldest') {
  reviewsSort.value = sort
  reviewsPage.value = 1
  reviews.value = await fetchReviews(1, sort)
}

function formatReviewDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString(locale.value, { month: 'long', day: 'numeric', year: 'numeric' }).replace(',', '')
}

const pricingStyle: Record<string, string> = {
  FREE: 'bg-emerald-50 text-emerald-700',
  FREEMIUM: 'bg-brand-50 text-brand-700',
  PAID: 'bg-amber-50 text-amber-700'
}

// The chips under the introduction: pricing, then categories, then badges.
const headerChips = computed(() => {
  if (!tool.value) return []
  return [
    { key: 'pricing', label: t(`pricing.${tool.value.pricingType}`), class: 'border border-ink-300 bg-white text-ink-900' },
    ...(tool.value.categories ?? []).map(cat => ({ key: `cat:${cat.slug}`, label: cat.name, to: `/category/${cat.slug}`, class: 'border border-brand-200 bg-white text-brand-500 hover:border-brand-400' })),
    ...badges.value.map(b => ({ key: `badge:${b.label}`, label: b.label, class: b.style }))
  ]
})
const badges = computed(() => {
  if (!tool.value) return []
  return [
    tool.value.isVerified && { label: t('tool.badgeVerified'), style: 'bg-blue-50 text-blue-700' },
    tool.value.isJustLaunched && { label: t('tool.badgeJustLaunched'), style: 'bg-purple-50 text-purple-700' },
    tool.value.isFreeTool && { label: t('tool.badgeFreeTool'), style: 'bg-emerald-50 text-emerald-700' }
  ].filter(Boolean) as { label: string; style: string }[]
})

const displayRating = computed(() => (tool.value?.reviewCount ? tool.value.averageRating : 5))

const { user, ensureUser, authHeaders, logout } = useAuth()
const isLoggedIn = computed(() => !!user.value)

const newRating = ref(0)
const newRatingHover = ref(0)
const newComment = ref('')
const reviewSubmitAttempted = ref(false)
const reviewSubmitting = ref(false)
const reviewSubmitted = ref(false)
const reviewError = ref('')
const canSubmitReview = computed(() => newComment.value.trim().length > 0)
const reviewDraftKey = computed(() => `topainew:review-draft:${slug.value}`)

// `submitAfterLogin` (a timestamp) is set when a guest clicks "Login to review":
// if they come back logged in shortly after, the draft is sent automatically.
// An old flag (abandoned login) is ignored so nothing is posted unexpectedly.
const SUBMIT_AFTER_LOGIN_TTL_MS = 30 * 60 * 1000

function loadReviewDraft() {
  if (!import.meta.client) return null
  try {
    const raw = localStorage.getItem(reviewDraftKey.value)
    if (!raw) return null
    const draft = JSON.parse(raw) as { rating?: number; comment?: string; submitAfterLogin?: number }
    newRating.value = draft.rating ?? 0
    newComment.value = draft.comment ?? ''
    return draft
  } catch {
    // ignore corrupt draft
    return null
  }
}

function saveReviewDraft(submitAfterLogin = false) {
  if (!import.meta.client) return
  if (!newRating.value && !newComment.value) return clearReviewDraft()
  try {
    const draft = { rating: newRating.value, comment: newComment.value, submitAfterLogin: submitAfterLogin ? Date.now() : undefined }
    localStorage.setItem(reviewDraftKey.value, JSON.stringify(draft))
  } catch {
    // storage unavailable — the draft just won't survive the login redirect
  }
}

function clearReviewDraft() {
  if (!import.meta.client) return
  try {
    localStorage.removeItem(reviewDraftKey.value)
  } catch {
    // ignore
  }
}

watch([newRating, newComment], () => saveReviewDraft())

onMounted(async () => {
  const draft = loadReviewDraft()
  const me = await ensureUser()
  const flaggedAt = draft?.submitAfterLogin
  const submitAfterLogin = typeof flaggedAt === 'number' && Date.now() - flaggedAt < SUBMIT_AFTER_LOGIN_TTL_MS
  if (me && submitAfterLogin && canSubmitReview.value) {
    await submitNewReview()
    document.getElementById('section-reviews')?.scrollIntoView({ behavior: 'smooth' })
  }
})

const loginLink = computed(() => ({ path: '/login', query: { redirect: route.fullPath } }))

function goToLoginToReview() {
  reviewSubmitAttempted.value = true
  if (!canSubmitReview.value) return
  saveReviewDraft(true)
  navigateTo(localePath(loginLink.value))
}

async function submitNewReview() {
  reviewSubmitAttempted.value = true
  reviewError.value = ''
  reviewSubmitted.value = false
  if (!canSubmitReview.value || reviewSubmitting.value) return
  reviewSubmitting.value = true
  try {
    await $fetch(`/api/tools/${slug.value}/reviews`, {
      method: 'POST',
      headers: authHeaders(),
      body: { rating: newRating.value || 5, comment: newComment.value.trim(), locale: locale.value }
    })
    reviewSubmitted.value = true
    newRating.value = 0
    newComment.value = ''
    reviewSubmitAttempted.value = false
    clearReviewDraft()
  } catch (e: any) {
    if (e?.statusCode === 409) {
      reviewError.value = t('tool.reviewAlreadySubmitted')
      clearReviewDraft()
    } else if (e?.statusCode === 401) {
      // Session expired or account banned — drop the stale login so the
      // "Login to review" button comes back; the draft is kept for after login.
      logout()
      reviewError.value = t('tool.reviewSessionExpired')
      saveReviewDraft()
    } else {
      reviewError.value = e?.data?.message || t('tool.reviewSubmitError')
      saveReviewDraft()
    }
  } finally {
    reviewSubmitting.value = false
  }
}

const addedOn = computed(() => {
  const date = tool.value?.addedOn
  if (!date) return '—'
  // addedOn is stored in UTC; show the UTC day so it matches the DB and the /archive/[date] page.
  return new Date(date).toLocaleDateString(locale.value === 'vi' ? 'vi-VN' : 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC'
  })
})

const analytics = computed(() => tool.value?.analytics ?? null)
const numberLocale = computed(() => (locale.value === 'vi' ? 'vi-VN' : locale.value))

function formatCompact(n: number | null | undefined) {
  if (n == null) return '—'
  return new Intl.NumberFormat(numberLocale.value, { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

// Month-over-month growth badge: "12.3%"; a jump of 1000%+ (a tiny previous month)
// reads better as a multiplier — "736×" instead of "73,505.9%".
function formatGrowth(pct: number) {
  const abs = Math.abs(pct)
  if (pct >= 1000) return `${new Intl.NumberFormat(numberLocale.value, { maximumFractionDigits: 0 }).format(1 + pct / 100)}×`
  return `${new Intl.NumberFormat(numberLocale.value, { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(abs)}%`
}

function formatDuration(seconds: number | null | undefined) {
  if (seconds == null) return '—'
  const s = Math.round(seconds)
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map(v => String(v).padStart(2, '0')).join(':')
}

const analyticsStats = computed(() => {
  const a = analytics.value
  if (!a) return []
  // Metrics without data (null from the API) are left out instead of showing "—".
  return [
    a.monthlyVisits != null && { label: t('tool.monthlyVisits'), value: formatCompact(a.monthlyVisits) },
    a.avgVisitDuration != null && { label: t('tool.avgVisitDuration'), value: formatDuration(a.avgVisitDuration) },
    a.pagesPerVisit != null && { label: t('tool.pagePerVisit'), value: a.pagesPerVisit.toFixed(2) },
    a.bounceRatePct != null && { label: t('tool.bounceRate'), value: `${a.bounceRatePct.toFixed(2)}%` }
  ].filter(Boolean) as { label: string; value: string }[]
})

// Round a raw axis step up to 1/2/2.5/5 × 10^n so tick labels read cleanly.
function niceStep(raw: number) {
  const pow = 10 ** Math.floor(Math.log10(raw))
  const f = raw / pow
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * pow
}

// Monotone cubic (Fritsch–Carlson) path: smooth like the reference chart but never
// overshoots between points, so a flat stretch stays flat.
function monotonePath(pts: { x: number; y: number }[]) {
  const n = pts.length
  const dx = pts.slice(1).map((p, i) => p.x - pts[i]!.x)
  const slope = pts.slice(1).map((p, i) => (p.y - pts[i]!.y) / dx[i]!)
  const tan = pts.map((_, i) => {
    if (i === 0) return slope[0]!
    if (i === n - 1) return slope[n - 2]!
    const a = slope[i - 1]!, b = slope[i]!
    return a * b <= 0 ? 0 : (3 * (dx[i - 1]! + dx[i]!)) / ((2 * dx[i]! + dx[i - 1]!) / a + (dx[i]! + 2 * dx[i - 1]!) / b)
  })
  let d = `M${pts[0]!.x},${pts[0]!.y}`
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i]! / 3
    d += ` C${pts[i]!.x + h},${pts[i]!.y + tan[i]! * h} ${pts[i + 1]!.x - h},${pts[i + 1]!.y - tan[i + 1]! * h} ${pts[i + 1]!.x},${pts[i + 1]!.y}`
  }
  return d
}

// Plot area is a 0–100 × 0–100 space stretched to the container; text and dots
// are HTML positioned in % so they stay crisp at any width.
const trafficChart = computed(() => {
  const points = analytics.value?.chart ?? []
  if (points.length < 2) return null
  const values = points.map(p => p.visits)
  const max = Math.max(...values)
  const min = Math.min(...values)

  // Start the axis at 0 unless the data sits in a narrow band far above it
  // (e.g. 973M–981M), where a 0 baseline would flatten the line entirely.
  const fromZero = min < max * 0.5
  const step = niceStep(((fromZero ? max : max - min) || max || 1) / 4)
  const lo = fromZero ? 0 : Math.max(0, Math.floor(min / step) * step - step)
  const hi = Math.max(Math.ceil(max / step) * step, lo + step)
  const ticks: { value: string; y: number }[] = []
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push({ value: formatCompact(v), y: 100 - ((v - lo) / (hi - lo)) * 100 })

  // Category axis with half-step padding at both ends, like echarts' boundaryGap.
  const coords = points.map((p, i) => ({
    x: ((i + 0.5) / points.length) * 100,
    y: 100 - ((p.visits - lo) / (hi - lo)) * 100,
    label: formatMonth(p.month),
    value: formatCompact(p.visits)
  }))
  const line = monotonePath(coords)
  const first = coords[0]!, last = coords.at(-1)!
  return { coords, ticks, line, area: `${line} L${last.x},100 L${first.x},100 Z` }
})

const formatMonth = (month: string) =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString(numberLocale.value, { month: 'short', year: 'numeric', timeZone: 'UTC' })

// "Mar 2026 – May 2026", from the first and last chart points.
const analyticsPeriod = computed(() => {
  const chart = analytics.value?.chart ?? []
  if (!chart.length) return null
  return `${formatMonth(chart[0]!.month)} – ${formatMonth(chart.at(-1)!.month)}`
})

const sourceColors = ['#FF5B84', '#2A7BFF', '#17D5F4', '#FBC21E', '#0FC98A', '#11A085']
const sourceLabel = (name: string) => {
  const key = `tool.source${name.replace(/[^A-Za-z]/g, '')}`
  return te(key) ? t(key) : name
}

// Donut with outside labels, echarts-style: segments start at 12 o'clock and go
// clockwise; each label sits outside its segment's mid-angle, then labels on the
// same side are pushed apart vertically so small neighbouring slices don't overlap.
// Geometry follows the design reference (outer 86 / inner 62 / labels at ~1.3r),
// scaled 1.25× so the chart fills the column.
const DONUT = { w: 700, h: 400, cx: 350, cy: 195, r: 100, inner: 76, labelR: 130, lineH: 16, hoverGrow: 10, font: 15 }
const hoveredSource = ref<number | null>(null)
const sourceDonut = computed(() => {
  const { cx, cy, r, inner, labelR, lineH, h, hoverGrow } = DONUT
  const point = (rad: number, angle: number) => [cx + rad * Math.sin(angle), cy - rad * Math.cos(angle)] as const
  const arc = (outer: number, from: number, to: number) => {
    const large = to - from > Math.PI ? 1 : 0
    const [x1, y1] = point(outer, from)
    const [x2, y2] = point(outer, to)
    const [x3, y3] = point(inner, to)
    const [x4, y4] = point(inner, from)
    return `M${x1},${y1} A${outer},${outer} 0 ${large} 1 ${x2},${y2} L${x3},${y3} A${inner},${inner} 0 ${large} 0 ${x4},${y4} Z`
  }
  const items = (analytics.value?.sources ?? [])
    .map((s, i) => ({ ...s, color: sourceColors[i % sourceColors.length]! }))
    .filter(s => s.pct > 0)
  const total = items.reduce((sum, s) => sum + s.pct, 0) || 1

  let start = 0
  const segments = items.map((s) => {
    // Cap a lone 100% slice just short of a full turn so the arc still draws.
    const sweep = Math.min((s.pct / total) * Math.PI * 2, Math.PI * 2 - 0.0001)
    const end = start + sweep
    const mid = start + sweep / 2
    const [lx, ly] = point(labelR, mid)
    const seg = {
      color: s.color,
      d: arc(r, start, end),
      // Hover state: the slice grows outward, like echarts' emphasis scale.
      dHover: arc(r + hoverGrow, start, end),
      label: { text: `${sourceLabel(s.name)}：${s.pct.toFixed(2)}%`, x: lx, y: ly, right: lx >= cx }
    }
    start = end
    return seg
  })

  for (const right of [true, false]) {
    const side = segments.map(s => s.label).filter(l => l.right === right).sort((a, b) => a.y - b.y)
    for (let i = 1; i < side.length; i++) side[i]!.y = Math.max(side[i]!.y, side[i - 1]!.y + lineH)
    // If the stack ran off the bottom, shift it back up and re-space upwards.
    const last = side.at(-1)
    if (last && last.y > h - 8) {
      last.y = h - 8
      for (let i = side.length - 2; i >= 0; i--) side[i]!.y = Math.min(side[i]!.y, side[i + 1]!.y - lineH)
    }
    // Moving a label vertically can pull it over the ring; slide it back out
    // along the label circle so it always clears the donut.
    for (const l of side) {
      const dy = l.y - cy
      const dx = Math.abs(dy) < labelR ? Math.sqrt(labelR ** 2 - dy ** 2) : 6
      l.x = right ? cx + dx : cx - dx
    }
  }
  return segments
})

const countryName = (code: string) => {
  try {
    return new Intl.DisplayNames([numberLocale.value], { type: 'region' }).of(code) ?? code
  } catch {
    return code
  }
}

const geographyRegions = computed(() =>
  (analytics.value?.geography ?? []).map(g => ({ ...g, label: countryName(g.code) }))
)

// Country highlighted on the map and in the region list (ISO numeric), kept in sync both ways.
const hoveredRegion = ref<number | null>(null)

const analyticsFacts = computed(() => {
  const a = analytics.value
  if (!a) return []
  const r = a.ranking
  return [
    r.global && { label: t('tool.globalRank'), value: `#${r.global.toLocaleString(numberLocale.value)}` },
    r.country && r.countryRank && { label: countryName(r.country), value: `#${r.countryRank.toLocaleString(numberLocale.value)}`, flag: r.country.toLowerCase() },
    r.category && r.categoryRank && { label: r.category, value: `#${r.categoryRank.toLocaleString(numberLocale.value)}` },
    a.yearFounded && { label: t('tool.yearFounded'), value: a.yearFounded },
    a.employeeRange && { label: t('tool.employees'), value: a.employeeRange }
  ].filter(Boolean) as { label: string; value: string; flag?: string }[]
})

const requestUrl = useRequestURL()
const shareUrl = computed(() => requestUrl.href)
const twitterShareUrl = computed(() => `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl.value)}&text=${encodeURIComponent(tool.value?.name ?? '')}`)
const facebookShareUrl = computed(() => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl.value)}`)

// The star: saves the tool to the user's account (Dashboard → Saved AIs). Guests are
// sent to log in first and come back here.
const isSaved = ref(false)
const savePending = ref(false)

// Asked once per user: on mount when the session is already known (client-side
// navigation), otherwise when it resolves (the review code above calls ensureUser) —
// and again after old localStorage favorites were moved into the account.
async function loadSaved() {
  if (!user.value) {
    isSaved.value = false
    return
  }
  try {
    const res = await $fetch<{ saved: boolean; collectionCount: number }>(`/api/tools/${slug.value}/save`, { headers: authHeaders() })
    // A click while this was loading wins.
    if (savePending.value) return
    isSaved.value = res.saved
    // Live count: the page (and its API) is cached and may predate this user's own save.
    if (tool.value) tool.value.collectionCount = res.collectionCount
  } catch {
    // keep what is shown
  }
}
const savedImportVersion = useState('saved-import-version', () => 0)
onMounted(() => { if (user.value) loadSaved() })

// Hot this week on the home page (server/utils/toolStats.ts): a view of this page and the
// "Visit website" clicks — sent from the browser, so crawlers don't count. A click is sent
// with sendBeacon: it still goes out while the browser leaves for the other site.
function track(toolSlug: string, kind: 'view' | 'visit') {
  const url = `/api/tools/${encodeURIComponent(toolSlug)}/track`
  const body = JSON.stringify({ kind })
  if (kind === 'visit' && navigator.sendBeacon?.(url, new Blob([body], { type: 'application/json' }))) return
  $fetch(url, { method: 'POST', body: { kind } }).catch(() => {})
}
onMounted(() => track(slug.value, 'view'))
watch(slug, s => track(s, 'view'))
watch([() => user.value?.id, savedImportVersion], () => loadSaved())

async function toggleSaved() {
  if (!(await ensureUser())) {
    await navigateTo(localePath(loginLink.value))
    return
  }
  if (savePending.value) return
  const nextSaved = !isSaved.value
  const previousCount = tool.value?.collectionCount ?? 0

  isSaved.value = nextSaved
  if (tool.value) tool.value.collectionCount = Math.max(0, previousCount + (nextSaved ? 1 : -1))
  savePending.value = true
  try {
    const res = await $fetch<{ saved: boolean; collectionCount: number }>(`/api/tools/${slug.value}/save`, {
      method: 'POST',
      headers: authHeaders(),
      body: { saved: nextSaved }
    })
    isSaved.value = res.saved
    if (tool.value) tool.value.collectionCount = res.collectionCount
  } catch (e: unknown) {
    isSaved.value = !nextSaved
    if (tool.value) tool.value.collectionCount = previousCount
    // Session no longer valid (banned, password changed elsewhere): log in again.
    if ((e as { statusCode?: number })?.statusCode === 401) {
      logout()
      await navigateTo(localePath(loginLink.value))
    }
  } finally {
    savePending.value = false
  }
}

type TabKey = 'info' | 'pricing' | 'reviews' | 'faq' | 'analytics' | 'alternatives'
const tabs = computed<{ key: TabKey; id: string; label: string }[]>(() => {
  const list: { key: TabKey; id: string; label: string }[] = [
    { key: 'info', id: 'section-info', label: t('tool.tabProductInfo') }
  ]
  if (tool.value?.faqs?.length) list.push({ key: 'faq', id: 'section-faq', label: t('tool.faqHeading', { name: tool.value?.name ?? '' }) })
  list.push(
    { key: 'reviews', id: 'section-reviews', label: t('tool.tabReviews') },
    { key: 'pricing', id: 'section-pricing', label: t('tool.tabPricing') },
    { key: 'analytics', id: 'section-analytics', label: t('tool.tabAnalytics') },
    { key: 'alternatives', id: 'section-alternatives', label: t('tool.tabAlternatives') }
  )
  return list
})
const activeTab = ref<TabKey>('info')

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

let sectionObserver: IntersectionObserver | null = null
onMounted(() => {
  if (!import.meta.client) return
  // FAQ is nested inside the info section, so track every visible section and
  // prefer the later tab (the nested one) when both are in view.
  const visible = new Set<string>()
  sectionObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) visible.add(entry.target.id)
      else visible.delete(entry.target.id)
    }
    const current = [...tabs.value].reverse().find(tab => visible.has(tab.id))
    if (current) activeTab.value = current.key
  }, { rootMargin: '-140px 0px -65% 0px', threshold: 0 })
  for (const tab of tabs.value) {
    const el = document.getElementById(tab.id)
    if (el) sectionObserver.observe(el)
  }
})
onBeforeUnmount(() => sectionObserver?.disconnect())

// Meta description: the short description, else the start of the long one as plain text.
const seoDescription = computed(() => {
  const t = tool.value
  if (!t) return ''
  const text = (t.shortDesc || t.description || '').replace(/<[^>]*>/g, ' ').replace(/[#*_`>[\]()]/g, '').replace(/\s+/g, ' ').trim()
  const fallback = `${t.name}: features, pricing, reviews and alternatives on TopAICollection.`
  if (!text) return fallback
  return text.length > 160 ? `${text.slice(0, 157).replace(/\s+\S*$/, '')}…` : text
})
const abs = useAbsoluteUrl()
// heroImages falls back to the logo; a logo is not a screenshot and is too small for
// a large share card, so it only becomes og:image with the "summary" card.
const seoScreenshot = computed(() => {
  const first = heroImages.value[0]
  return first && first !== tool.value?.logoUrl ? abs(first) : undefined
})
const seoImage = computed(() => seoScreenshot.value ?? (tool.value?.logoUrl ? abs(tool.value.logoUrl) : undefined))

useSeoMeta({
  title: () => `${tool.value?.name} — TopAICollection`,
  description: seoDescription,
  ogTitle: () => `${tool.value?.name} — TopAICollection`,
  ogDescription: seoDescription,
  ogImage: seoImage,
  twitterCard: () => (seoScreenshot.value ? 'summary_large_image' : 'summary')
})

// Only languages with a translated description get their own indexable page.
useSeoLocales(() => tool.value?.availableLocales)
const { canonical } = usePageSeoUrls()

useBreadcrumbLd(() => [
  ...(category.value ? [[category.value.name, `/category/${category.value.slug}`] as [string, string]] : []),
  [tool.value?.name ?? '', `/tools/${slug.value}`]
])

// Rich result data. Google's software-app result needs an offer AND a rating (or review);
// a WebApplication missing either is reported as an error. So: a tool with approved
// reviews (the page shows 5 stars as a placeholder otherwise) and a known price — free or
// freemium = a $0 offer; paid tools carry no price — is a WebApplication; any other tool
// is described as the WebPage about it, which has no required fields.
useJsonLd('tool', () => {
  const t = tool.value
  if (!t) return null
  const offers = t.pricingType === 'FREE' || t.pricingType === 'FREEMIUM'
    ? { '@type': 'Offer', price: 0, priceCurrency: 'USD' }
    : null
  const about = {
    name: t.name,
    description: seoDescription.value,
    ...(t.logoUrl && { image: abs(t.logoUrl) }),
    ...(t.website && { sameAs: t.website })
  }
  if (offers && t.reviewCount > 0) {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      ...about,
      url: canonical.value,
      applicationCategory: category.value?.name,
      operatingSystem: 'Web',
      ...(seoScreenshot.value && { screenshot: seoScreenshot.value }),
      aggregateRating: { '@type': 'AggregateRating', ratingValue: t.averageRating, reviewCount: t.reviewCount, bestRating: 5, worstRating: 1 },
      offers
    }
  }
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: t.name,
    url: canonical.value,
    description: seoDescription.value,
    ...(seoScreenshot.value && { primaryImageOfPage: seoScreenshot.value }),
    about: { '@type': 'Thing', ...about }
  }
})
</script>

<template>
  <div v-if="tool" class="bg-[linear-gradient(180deg,#FFF3F0_0px,#FFFFFF_520px)]">
  <div class="mx-auto max-w-[1300px] px-4 py-8 sm:px-6 lg:px-8">
    <nav class="flex flex-wrap items-center gap-2 text-base text-ink-900">
      <NuxtLinkLocale to="/" class="hover:text-brand-600">Home</NuxtLinkLocale>
      <template v-if="category">
        <svg class="h-3.5 w-3.5 text-ink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
        <NuxtLinkLocale :to="`/category/${category.slug}`" class="hover:text-brand-600">{{ category.name }}</NuxtLinkLocale>
      </template>
      <svg class="h-3.5 w-3.5 text-ink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
      <span class="text-ink-500">{{ tool.name }}</span>
    </nav>

    <div class="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_500px]">
      <div>
        <div class="flex flex-wrap items-center gap-x-10 gap-y-3">
          <h1 class="text-4xl font-bold text-ink-900">{{ tool.name }}</h1>
          <a
            v-if="tool.website"
            :href="tool.website"
            target="_blank"
            rel="noopener noreferrer nofollow"
            @click="track(tool.slug, 'visit')"
            @auxclick="track(tool.slug, 'visit')"
            class="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md bg-brand-500 px-6 py-2.5 text-lg text-white transition hover:bg-brand-600"
          >
            <svg class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H18m0 0v4.5M18 6l-7.5 7.5M6 6.75h3M6 12h3m-3 5.25h9a1.5 1.5 0 001.5-1.5V13.5" /></svg>
            {{ t('tool.openSite') }}
          </a>
        </div>

        <div class="mt-5 flex flex-wrap items-center gap-3 text-base">
          <span class="flex items-center gap-1.5">
            <span class="flex gap-0.5 text-brand-500">
              <svg v-for="i in 5" :key="i" class="h-5 w-5" viewBox="0 0 20 20" :fill="i <= Math.round(displayRating) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1"><path d="M10 1.3l2.7 5.5 6 .88-4.35 4.24 1.03 6L10 14.9l-5.38 2.83 1.03-6L1.3 7.67l6-.87z" /></svg>
            </span>
            <span class="text-sm text-ink-700">{{ Number.isInteger(displayRating) ? displayRating : displayRating.toFixed(1) }}</span>
          </span>
          <span class="text-ink-300">|</span>
          <span class="text-ink-900">{{ tool.reviewCount || 0 }} {{ t('tool.reviewsLabel') }}</span>
          <span class="text-ink-300">|</span>
          <span class="text-ink-900">{{ tool.collectionCount || 0 }} {{ t('tool.savedLabel') }}</span>
        </div>

        <dl class="mt-7 space-y-4 text-base">
          <div v-if="tool.shortDesc" class="flex gap-4">
            <dt class="w-[130px] shrink-0 whitespace-nowrap font-bold text-ink-900">{{ t('tool.introduction') }}:</dt>
            <dd class="min-w-0 flex-1 leading-relaxed text-ink-900">{{ tool.shortDesc }}</dd>
          </div>
          <div class="flex gap-4">
            <dt class="w-[130px] shrink-0 whitespace-nowrap font-bold text-ink-900">{{ t('tool.addedOn') }}:</dt>
            <dd class="text-ink-900">{{ addedOn }}</dd>
          </div>
          <div class="flex gap-4">
            <dt class="w-[130px] shrink-0 whitespace-nowrap font-bold text-ink-900">{{ t('tool.monthlyVisitors') }}:</dt>
            <dd class="text-ink-900">{{ tool.monthlyVisits ? tool.monthlyVisits.toLocaleString() : '--' }}</dd>
          </div>
          <div v-if="tool.twitterUrl || tool.discordUrl" class="flex items-center gap-4">
            <dt class="w-[130px] shrink-0 whitespace-nowrap font-bold text-ink-900">{{ t('tool.socialAndEmail') }}:</dt>
            <dd class="flex items-center gap-2">
              <a v-if="tool.twitterUrl" :href="tool.twitterUrl" target="_blank" rel="noopener noreferrer" title="Twitter / X" class="flex h-6 w-6 items-center justify-center rounded-full bg-ink-900 text-xs font-bold text-white hover:bg-brand-500">𝕏</a>
              <a v-if="tool.discordUrl" :href="tool.discordUrl" target="_blank" rel="noopener noreferrer" title="Discord" class="flex h-6 w-6 items-center justify-center rounded-full bg-[#5865F2] text-[10px] font-bold text-white hover:opacity-80">D</a>
            </dd>
          </div>
        </dl>

        <!-- Pricing, categories and badges on two lines at most; the rest behind "⋯". -->
        <ChipList class="mt-7" :chips="headerChips" :more-label="t('tool.moreCategories')" />
      </div>

      <div>
        <div class="flex items-center justify-end gap-3">
          <button
            type="button"
            :class="[
              'flex items-center gap-1.5 px-1 text-base transition',
              isSaved ? 'text-brand-500' : 'text-ink-500 hover:text-brand-500'
            ]"
            :title="isSaved ? t('tool.saved') : t('tool.save')"
            :aria-pressed="isSaved"
            :disabled="savePending"
            @click="toggleSaved"
          >
            <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.563.563 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>
            <span class="text-ink-900">{{ tool.collectionCount || 0 }}</span>
          </button>
          <a
            :href="twitterShareUrl"
            target="_blank"
            rel="noopener noreferrer"
            title="Twitter / X"
            class="flex h-10 w-10 items-center justify-center rounded border border-ink-200 bg-white text-base font-bold text-ink-900 transition hover:border-brand-300 hover:text-brand-600"
          >𝕏</a>
          <a
            :href="facebookShareUrl"
            target="_blank"
            rel="noopener noreferrer"
            title="Facebook"
            class="flex h-10 w-10 items-center justify-center rounded border border-ink-200 bg-white text-lg font-bold text-[#1877F2] transition hover:border-brand-300"
          >f</a>
        </div>

        <div v-if="heroImages.length" class="relative mt-6 overflow-hidden rounded shadow-[0_2px_12px_rgba(0,0,0,0.12)]">
          <div
            ref="slider"
            :class="[
              'flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
              heroImages.length > 1 && 'cursor-grab',
              isDragging && 'cursor-grabbing select-none',
              !snapDisabled && 'snap-x snap-mandatory'
            ]"
            @scroll.passive="onSliderScroll"
            @pointerdown="onDragStart"
            @pointermove="onDragMove"
            @pointerup="onDragEnd"
            @pointercancel="onDragEnd"
          >
            <img
              v-for="(src, i) in heroImages"
              :key="src"
              :src="sizedImage(src, 960)"
              :alt="`${tool.name} screenshot ${i + 1}`"
              :loading="i === 0 ? 'eager' : 'lazy'"
              draggable="false"
              class="aspect-video w-full shrink-0 snap-start object-cover"
            >
          </div>

          <template v-if="heroImages.length > 1">
            <div class="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/30 px-2 py-1">
              <button
                v-for="(_, i) in heroImages"
                :key="i"
                type="button"
                :aria-label="`Go to image ${i + 1}`"
                :class="['h-2 rounded-full transition-all', activeSlide === i ? 'w-5 bg-white' : 'w-2 bg-white/60 hover:bg-white']"
                @click="goToSlide(i)"
              />
            </div>
          </template>
        </div>

        <div class="mt-3 flex justify-end gap-4">
          <NuxtLinkLocale to="/advertise" class="rounded bg-brand-500 px-3 py-2 text-sm text-white transition hover:bg-brand-600">
            {{ t('tool.advertiseTool') }}
          </NuxtLinkLocale>
          <NuxtLinkLocale to="/update-ai" class="rounded border border-brand-500 bg-white px-3 py-2 text-sm text-brand-500 transition hover:bg-brand-50">
            {{ t('tool.updateTool') }}
          </NuxtLinkLocale>
        </div>
      </div>
    </div>

    <div class="sticky top-[65px] z-30 mt-6 border-b border-ink-200 bg-white/95 backdrop-blur">
      <nav class="-mb-px flex gap-8 overflow-x-auto">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          :class="[
            'shrink-0 border-b-2 pb-2 pt-2 text-lg font-bold transition',
            activeTab === tab.key ? 'border-brand-500 text-brand-500' : 'border-transparent text-ink-900 hover:text-brand-500'
          ]"
          @click="scrollToSection(tab.id)"
        >
          {{ tab.label }}
        </button>
      </nav>
    </div>

    <div v-if="alternatives.length" class="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-5">
      <NuxtLinkLocale
        v-for="alt in alternatives.slice(0, 5)"
        :key="alt.slug"
        :to="`/tools/${alt.slug}`"
        class="min-w-0 rounded-xl border-2 border-brand-100 bg-white px-4 py-4 transition hover:border-brand-300"
      >
        <div class="flex items-center gap-2.5">
          <div v-if="alt.logoUrl" class="h-7 w-7 shrink-0 overflow-hidden rounded-full">
            <img data-logo :src="sizedImage(alt.logoUrl, 64, 64)" :alt="alt.name" loading="lazy" class="h-full w-full object-cover">
          </div>
          <div v-else class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-[10px] font-bold text-white">
            {{ alt.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'AI' }}
          </div>
          <p class="min-w-0 truncate text-base font-bold text-ink-900">{{ alt.name }}</p>
        </div>
        <p v-if="alt.shortDesc" class="mt-2.5 line-clamp-2 text-sm leading-snug text-ink-900">{{ alt.shortDesc }}</p>
      </NuxtLinkLocale>
    </div>

    <div class="mt-20 space-y-16">
      <div id="section-info" class="scroll-mt-32">
        <h2 class="text-[28px] font-bold leading-tight text-ink-900">{{ t('tool.productInformationHeading', { name: tool.name }) }}</h2>
        <div class="mt-6 divide-y divide-ink-100 rounded-lg border border-ink-200 bg-white p-7">
          <section v-if="tool.whatIs || tool.description" class="py-7 first:pt-0">
            <h3 class="text-2xl font-bold text-ink-900">{{ t('tool.whatIs', { name: tool.name }) }}</h3>
            <p class="mt-4 text-lg leading-[1.6] text-ink-900">{{ tool.whatIs || tool.description }}</p>
          </section>

          <section v-if="tool.howToUse" class="py-7 first:pt-0">
            <h3 class="text-2xl font-bold text-ink-900">{{ t('tool.howToUseHeading', { name: tool.name }) }}</h3>
            <p class="mt-4 text-lg leading-[1.6] text-ink-900">{{ tool.howToUse }}</p>
          </section>

          <section v-if="tool.coreFeatures?.length" class="py-7 first:pt-0">
            <h3 class="text-2xl font-bold text-ink-900">{{ t('tool.coreFeaturesHeading', { name: tool.name }) }}</h3>
            <ul class="mt-4 space-y-3">
              <li v-for="feature in tool.coreFeatures" :key="feature" class="flex items-center gap-3 text-lg text-ink-900">
                <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white">
                  <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                </span>
                {{ feature }}
              </li>
            </ul>
          </section>

          <section v-if="tool.useCases?.length" class="py-7 first:pt-0">
            <h3 class="text-2xl font-bold text-ink-900">{{ t('tool.useCasesHeading', { name: tool.name }) }}</h3>
            <ul class="mt-4 space-y-3">
              <li v-for="(useCase, i) in tool.useCases" :key="useCase" class="flex items-center gap-3 text-lg text-ink-900">
                <span class="rounded-md bg-ink-100 px-2 py-0.5 text-xs font-bold text-ink-500">#{{ i + 1 }}</span>
                {{ useCase }}
              </li>
            </ul>
          </section>

          <section v-if="tool.faqs?.length" id="section-faq" class="scroll-mt-32 py-7 first:pt-0">
            <h3 class="text-2xl font-bold text-ink-900">{{ t('tool.faqHeading', { name: tool.name }) }}</h3>
            <div class="mt-4 divide-y divide-ink-100">
              <details v-for="(faq, i) in tool.faqs" :key="i" class="py-4 last:pb-0">
                <summary class="cursor-pointer text-xl font-bold text-ink-900">{{ faq.question }}</summary>
                <p class="mt-2 text-lg leading-[1.6] text-ink-900">{{ faq.answer }}</p>
              </details>
            </div>
          </section>

          <section v-if="tool.tags?.length" class="py-7 first:pt-0">
            <div class="flex flex-wrap gap-2">
              <NuxtLinkLocale v-for="tag in tool.tags" :key="tag.slug" :to="`/tag/${tag.slug}`" class="rounded-full bg-ink-100 px-3 py-1 text-sm text-ink-700 transition hover:bg-brand-50 hover:text-brand-600">#{{ tag.name }}</NuxtLinkLocale>
            </div>
          </section>

          <section class="py-7 first:pt-0 last:pb-0">
            <dl class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div v-if="tool.affiliateUrl" class="flex gap-2 text-base">
                <dt class="font-semibold text-ink-900">{{ t('tool.affiliateLink') }}:</dt>
                <dd class="truncate text-ink-900">{{ tool.affiliateUrl }}</dd>
              </div>
              <div v-if="tool.couponCode" class="flex gap-2 text-base">
                <dt class="font-semibold text-ink-900">{{ t('tool.couponCode') }}:</dt>
                <dd class="text-ink-900">{{ tool.couponCode }}</dd>
              </div>
            </dl>
            <div class="mt-4 flex flex-wrap gap-3 text-base">
              <a v-if="tool.twitterUrl" :href="tool.twitterUrl" target="_blank" rel="noopener noreferrer" class="text-brand-600 hover:text-brand-700">Twitter / X ↗</a>
              <a v-if="tool.discordUrl" :href="tool.discordUrl" target="_blank" rel="noopener noreferrer" class="text-brand-600 hover:text-brand-700">Discord ↗</a>
            </div>
          </section>
        </div>
      </div>

      <AdBanner v-if="adBanner" :ad="adBanner" placement="tool" />

      <div id="section-reviews" class="scroll-mt-32">
        <h2 class="text-[28px] font-bold leading-tight text-ink-900">{{ t('tool.reviewsHeading', { name: tool.name, count: reviewsTotal }) }}</h2>

        <div class="mt-6 divide-y divide-ink-100 rounded-lg border border-ink-200 bg-white p-7">
          <div class="flex items-center gap-3 pb-7">
            <div class="flex gap-1 text-xl text-brand-500">
              <span v-for="i in 5" :key="i">{{ i <= Math.round(displayRating) ? '★' : '☆' }}</span>
            </div>
            <p class="text-base text-ink-900">{{ displayRating.toFixed(1) }} {{ t('tool.outOf5') }}</p>
          </div>

          <div class="pt-7">
            <h3 class="text-2xl font-bold text-ink-900">{{ t('tool.ratingPrompt', { name: tool.name }) }}</h3>
            <div class="mt-4 flex gap-1 text-2xl" @mouseleave="newRatingHover = 0">
              <button
                v-for="i in 5"
                :key="i"
                type="button"
                class="leading-none transition-colors"
                :class="i <= (newRatingHover || newRating) ? 'text-brand-500' : 'text-ink-200'"
                @mouseenter="newRatingHover = i"
                @click="newRating = i"
              >★</button>
            </div>
            <div class="mt-3 flex gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-400">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
              </div>
              <div class="min-w-0 flex-1">
                <textarea
                  v-model="newComment"
                  :placeholder="t('tool.whatDoYouThink')"
                  maxlength="10000"
                  class="w-full resize-none rounded-lg border border-ink-200 bg-white p-3 text-base text-ink-900 outline-none focus:border-brand-300"
                  rows="3"
                />
                <div class="mt-1 flex items-center justify-between text-xs">
                  <span v-if="reviewSubmitAttempted && !canSubmitReview" class="text-red-500">{{ t('tool.enterReviewPrompt') }}</span>
                  <span v-else />
                  <span class="text-ink-400">{{ newComment.length }}/10000</span>
                </div>
              </div>
            </div>
            <button
              v-if="!isLoggedIn"
              type="button"
              class="mt-3 rounded-lg bg-brand-500 px-4 py-2 text-base font-semibold text-white transition hover:bg-brand-600"
              @click="goToLoginToReview"
            >
              {{ t('tool.loginToReview') }}
            </button>
            <button
              v-else
              type="button"
              :disabled="!canSubmitReview || reviewSubmitting"
              class="mt-3 rounded-lg px-4 py-2 text-base font-semibold transition"
              :class="canSubmitReview && !reviewSubmitting ? 'bg-brand-500 text-white hover:bg-brand-600' : 'cursor-not-allowed bg-ink-200 text-ink-500'"
              @click="submitNewReview"
            >
              {{ reviewSubmitting ? t('tool.submittingReview') : t('tool.submitReview') }}
            </button>
            <p v-if="reviewSubmitted" class="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{{ t('tool.reviewPendingNotice') }}</p>
            <p v-if="reviewError" class="mt-3 text-sm text-red-600">{{ reviewError }}</p>
          </div>
        </div>

        <div v-if="reviewsTotal > 0" class="mt-6 rounded-lg border border-ink-200 bg-white p-7">
          <div class="flex items-center gap-2">
            <span class="text-base font-semibold text-ink-600">{{ t('tool.sortBy') }}:</span>
            <select
              v-model="reviewsSort"
              class="rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-base font-semibold text-ink-600 outline-none focus:border-brand-300"
              @change="changeReviewsSort(reviewsSort)"
            >
              <option value="newest">{{ t('tool.sortNewest') }}</option>
              <option value="oldest">{{ t('tool.sortOldest') }}</option>
            </select>
          </div>

          <div class="mt-4 divide-y divide-ink-100">
            <div v-for="(review, i) in reviews" :key="i" class="flex gap-3 py-4 first:pt-0 last:pb-0">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-base font-bold text-brand-600">
                {{ (review.userName || '?').slice(0, 1).toUpperCase() }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-base font-semibold text-ink-900">{{ review.userName || 'Anonymous' }}</p>
                <p class="text-xs text-ink-400">{{ formatReviewDate(review.createdAt) }}</p>
                <div class="mt-1 flex text-base text-brand-500">
                  <span v-for="i2 in 5" :key="i2">{{ i2 <= review.rating ? '★' : '☆' }}</span>
                </div>
                <p v-if="review.comment" class="mt-2 text-lg leading-[1.6] text-ink-900">{{ review.comment }}</p>
              </div>
            </div>
          </div>

          <div v-if="reviewsHasMore" class="mt-5 flex justify-center">
            <button
              type="button"
              :disabled="reviewsLoading"
              class="rounded-full border border-ink-200 px-5 py-2 text-base font-semibold text-ink-700 transition hover:border-brand-300 hover:text-brand-600 disabled:opacity-50"
              @click="loadMoreReviews"
            >
              {{ reviewsLoading ? t('tool.loadingMore') : t('tool.loadMoreReviews') }}
            </button>
          </div>
        </div>
      </div>

      <div id="section-pricing" class="scroll-mt-32">
        <h2 class="text-[28px] font-bold leading-tight text-ink-900">{{ t('tool.pricingHeading', { name: tool.name }) }}</h2>
        <div class="mt-6 rounded-lg border border-ink-200 bg-white p-7">
          <div v-if="tool.pricingPlans?.length" class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div v-for="plan in tool.pricingPlans" :key="plan.name" class="rounded-lg border border-ink-100 p-4">
              <p class="text-xl font-bold text-ink-900">{{ plan.name }}</p>
              <p class="mt-1 text-2xl font-bold text-ink-900">
                {{ plan.price }}<span v-if="plan.period" class="text-base font-medium text-ink-400"> / {{ plan.period }}</span>
              </p>
              <ul class="mt-3 space-y-1.5 text-lg text-ink-900">
                <li v-for="feature in plan.features" :key="feature" class="flex gap-2"><span class="text-brand-500">✓</span> {{ feature }}</li>
              </ul>
            </div>
          </div>
          <template v-else>
            <span :class="['inline-block rounded-full px-3 py-1.5 text-base font-semibold', pricingStyle[tool.pricingType]]">{{ t(`pricing.${tool.pricingType}`) }}</span>
            <p v-if="tool.couponCode" class="mt-3 text-base text-ink-900">{{ t('tool.couponCode') }}: <span class="font-semibold text-ink-900">{{ tool.couponCode }}</span></p>
          </template>
        </div>
      </div>

      <div id="section-analytics" class="scroll-mt-32">
        <h2 class="text-[28px] font-bold leading-tight text-ink-900">{{ t('tool.analyticsHeading', { name: tool.name }) }}</h2>
        <div v-if="analytics" class="mt-6 overflow-hidden rounded-lg border border-ink-200 bg-white">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-ink-200 bg-ink-100/60 px-7 py-4">
            <h3 class="text-lg font-semibold text-ink-900">{{ t('tool.trafficAnalysis', { name: tool.name }) }}</h3>
            <span
              v-if="analytics.growthPct != null"
              :class="['inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold', analytics.growthPct >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700']"
              :title="t('tool.vsLastMonth')"
            >
              {{ analytics.growthPct >= 0 ? '▲' : '▼' }} {{ formatGrowth(analytics.growthPct) }}
              <span class="font-normal opacity-80">{{ t('tool.vsLastMonth') }}</span>
            </span>
          </div>

          <!-- Rankings & company facts -->
          <dl v-if="analyticsFacts.length" class="grid grid-cols-2 border-b border-ink-200 sm:grid-cols-3 lg:grid-cols-5 lg:divide-x lg:divide-ink-200">
            <div v-for="fact in analyticsFacts" :key="fact.label" class="px-7 py-4">
              <dt class="flex items-center gap-1.5 text-sm text-ink-500" :title="fact.label">
                <img v-if="fact.flag" :src="`https://flagcdn.com/w40/${fact.flag}.png`" alt="" class="h-3 w-[18px] shrink-0 rounded-[2px] object-cover" loading="lazy">
                <span class="truncate">{{ fact.label }}</span>
              </dt>
              <dd class="mt-1 text-lg font-bold text-ink-900">{{ fact.value }}</dd>
            </div>
          </dl>

          <!-- Visit over time: stats left, chart right -->
          <div v-if="analyticsStats.length || trafficChart" class="grid grid-cols-1 gap-8 border-b border-ink-200 p-7 lg:grid-cols-[320px_1fr]">
            <div v-if="analyticsStats.length">
              <h4 class="border-l-4 border-brand-500 pl-3 text-base font-semibold text-ink-900">{{ t('tool.visitOverTime') }}</h4>
              <dl class="mt-4 divide-y divide-ink-200 rounded-lg border border-ink-200">
                <div v-for="stat in analyticsStats" :key="stat.label" class="flex items-center justify-between px-5 py-3.5">
                  <dt class="text-base text-ink-900">{{ stat.label }}</dt>
                  <dd class="text-base font-bold text-ink-900">{{ stat.value }}</dd>
                </div>
              </dl>
            </div>

            <div v-if="trafficChart">
              <p v-if="analyticsPeriod" class="flex items-center gap-2 text-base text-ink-900">
                <svg class="h-5 w-5 text-ink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3.75 8.25h16.5M5.25 5.25h13.5a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-12a1.5 1.5 0 0 1 1.5-1.5Z" /><path stroke-linecap="round" stroke-linejoin="round" d="m9 14.25 2 2 4-4" /></svg>
                {{ analyticsPeriod }} · {{ t('tool.allTraffic') }}
              </p>
              <div class="mt-6 grid" style="grid-template-columns: 52px minmax(0, 1fr)">
                <!-- Y axis labels -->
                <div class="relative h-56">
                  <span
                    v-for="tick in trafficChart.ticks"
                    :key="tick.value"
                    class="absolute right-3 -translate-y-1/2 text-xs text-ink-500"
                    :style="{ top: `${tick.y}%` }"
                  >{{ tick.value }}</span>
                </div>

                <div>
                  <div class="relative h-56">
                    <!-- Grid: dashed lines, solid baseline -->
                    <span
                      v-for="(tick, i) in trafficChart.ticks"
                      :key="`grid-${tick.value}`"
                      :class="['absolute inset-x-0 border-t', i === 0 ? 'border-ink-300' : 'border-dashed border-ink-200']"
                      :style="{ top: `${tick.y}%` }"
                    />
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="absolute inset-0 h-full w-full overflow-visible">
                      <defs>
                        <linearGradient id="traffic-fill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stop-color="#E45937" stop-opacity="0.22" />
                          <stop offset="100%" stop-color="#E45937" stop-opacity="0" />
                        </linearGradient>
                      </defs>
                      <path :d="trafficChart.area" fill="url(#traffic-fill)" />
                      <path :d="trafficChart.line" fill="none" stroke="#E45937" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
                    </svg>
                    <!-- One hover column per point: guide line, hollow dot, tooltip -->
                    <div
                      v-for="c in trafficChart.coords"
                      :key="c.label"
                      class="group absolute inset-y-0 -translate-x-1/2"
                      :style="{ left: `${c.x}%`, width: `${100 / trafficChart.coords.length}%` }"
                    >
                      <span class="absolute inset-y-0 left-1/2 hidden border-l border-dashed border-brand-300 group-hover:block" />
                      <span
                        class="absolute left-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand-400 bg-white transition-transform group-hover:scale-125"
                        :style="{ top: `${c.y}%` }"
                      />
                      <span
                        class="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 -translate-y-[calc(100%+12px)] whitespace-nowrap rounded-md border border-ink-200 bg-white px-3 py-2 text-left shadow-lg group-hover:block"
                        :style="{ top: `${c.y}%` }"
                      >
                        <span class="block text-xs text-ink-500">{{ c.label }}</span>
                        <span class="block text-sm font-semibold text-ink-900">{{ c.value }}</span>
                      </span>
                    </div>
                  </div>
                  <!-- X axis labels, centred under each point -->
                  <div class="relative mt-3 h-4">
                    <span
                      v-for="c in trafficChart.coords"
                      :key="`x-${c.label}`"
                      class="absolute -translate-x-1/2 whitespace-nowrap text-xs text-ink-500"
                      :style="{ left: `${c.x}%` }"
                    >{{ c.label }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Geography: top regions left, world map right -->
          <div v-if="analytics.geography?.length" class="grid grid-cols-1 gap-8 border-b border-ink-200 p-7 lg:grid-cols-[320px_1fr]">
            <div>
              <h4 class="border-l-4 border-brand-500 pl-3 text-base font-semibold text-ink-900">{{ t('tool.geography') }}</h4>
              <p class="mt-4 text-base text-ink-900">{{ t('tool.topRegions', { count: analytics.geography.length }) }}</p>
              <ul class="mt-3 divide-y divide-ink-200 rounded-lg border border-ink-200">
                <li
                  v-for="region in geographyRegions"
                  :key="region.code"
                  :class="['flex items-center gap-3 px-5 py-3.5 text-base transition-colors', region.numeric != null && region.numeric === hoveredRegion && 'bg-[#2A7BFF]/10']"
                  @mouseenter="hoveredRegion = region.numeric"
                  @mouseleave="hoveredRegion = null"
                >
                  <img :src="`https://flagcdn.com/w40/${region.code.toLowerCase()}.png`" alt="" class="h-[18px] w-[30px] shrink-0 object-cover" loading="lazy">
                  <span class="min-w-0 truncate text-ink-900">{{ region.label }}</span>
                  <span class="ml-auto font-bold text-ink-900">{{ region.pct.toFixed(2) }}%</span>
                </li>
              </ul>
            </div>
            <div>
              <p v-if="analyticsPeriod" class="flex items-center gap-2 text-base text-ink-900">
                <svg class="h-5 w-5 text-ink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3.75 8.25h16.5M5.25 5.25h13.5a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-12a1.5 1.5 0 0 1 1.5-1.5Z" /><path stroke-linecap="round" stroke-linejoin="round" d="m9 14.25 2 2 4-4" /></svg>
                {{ analyticsPeriod }} · {{ t('tool.desktopOnly') }}
              </p>
              <div class="mx-auto mt-6 max-w-[520px]">
                <WorldMap v-model:active="hoveredRegion" :regions="geographyRegions" />
              </div>
            </div>
          </div>

          <!-- Traffic sources: table left, donut right -->
          <div v-if="analytics.sources.length" class="grid grid-cols-1 gap-8 border-b border-ink-200 p-7 lg:grid-cols-[320px_1fr]">
            <div>
              <h4 class="border-l-4 border-brand-500 pl-3 text-base font-semibold text-ink-900">{{ t('tool.trafficSources') }}</h4>
              <ul class="mt-4 divide-y divide-ink-200 rounded-lg border border-ink-200">
                <li v-for="(s, i) in analytics.sources" :key="s.name" class="flex items-center gap-3 px-5 py-3.5 text-base">
                  <span class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ backgroundColor: sourceColors[i % sourceColors.length] }" />
                  <span class="text-ink-900">{{ sourceLabel(s.name) }}</span>
                  <span class="ml-auto font-bold text-ink-900">{{ s.pct.toFixed(2) }}%</span>
                </li>
              </ul>
            </div>
            <div class="flex items-center justify-center">
              <svg :viewBox="`0 0 ${DONUT.w} ${DONUT.h}`" class="w-full" :style="{ maxWidth: `${DONUT.w}px` }" role="img" :aria-label="t('tool.trafficSources')">
                <path
                  v-for="(seg, i) in sourceDonut"
                  :key="seg.d"
                  :d="hoveredSource === i ? seg.dHover : seg.d"
                  :fill="seg.color"
                  class="cursor-pointer"
                  style="transition: d 0.2s ease-out"
                  @mouseenter="hoveredSource = i"
                  @mouseleave="hoveredSource = null"
                />
                <text
                  v-for="seg in sourceDonut"
                  :key="seg.label.text"
                  :x="seg.label.x"
                  :y="seg.label.y"
                  :fill="seg.color"
                  :text-anchor="seg.label.right ? 'start' : 'end'"
                  dominant-baseline="middle"
                  :font-size="DONUT.font"
                >{{ seg.label.text }}</text>
              </svg>
            </div>
          </div>

          <!-- Top keywords -->
          <div v-if="analytics.keywords.length" class="border-b border-ink-200 p-7">
            <h4 class="border-l-4 border-brand-500 pl-3 text-base font-semibold text-ink-900">{{ t('tool.topKeywords') }}</h4>
            <div class="mt-4 overflow-x-auto rounded-lg border border-ink-200">
              <table class="w-full text-base">
                <thead class="bg-ink-100/60 text-left text-sm text-ink-500">
                  <tr>
                    <th class="px-5 py-3 font-medium">{{ t('tool.keyword') }}</th>
                    <th class="px-5 py-3 text-right font-medium">{{ t('tool.searchVolume') }}</th>
                    <th class="px-5 py-3 text-right font-medium">{{ t('tool.keywordType') }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-ink-200">
                  <tr v-for="kw in analytics.keywords" :key="kw.keyword">
                    <td class="px-5 py-3 text-ink-900">{{ kw.keyword }}</td>
                    <td class="px-5 py-3 text-right font-semibold text-ink-900">{{ formatCompact(kw.volume) }}</td>
                    <td class="px-5 py-3 text-right">
                      <span :class="['rounded-full px-2.5 py-0.5 text-xs font-semibold', kw.type === 'paid' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700']">
                        {{ kw.type === 'paid' ? t('tool.keywordPaid') : t('tool.keywordOrganic') }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Mobile apps -->
          <div v-if="analytics.apps.length" class="p-7">
            <h4 class="border-l-4 border-brand-500 pl-3 text-base font-semibold text-ink-900">{{ t('tool.mobileApps') }}</h4>
            <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div v-for="app in analytics.apps" :key="app.title + app.store" class="flex items-center gap-4 rounded-lg border border-ink-200 p-4">
                <img v-if="app.icon" :src="app.icon" :alt="app.title" class="h-12 w-12 shrink-0 rounded-xl" loading="lazy">
                <div class="min-w-0">
                  <p class="truncate font-semibold text-ink-900">{{ app.title }}</p>
                  <p class="mt-0.5 text-sm text-ink-500">
                    {{ app.store === 'appstore' ? 'App Store' : 'Google Play' }}
                    <template v-if="app.rating"> · ★ {{ app.rating.toFixed(1) }} ({{ formatCompact(app.ratingCount) }})</template>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p v-else class="mt-6 rounded-xl border border-dashed border-ink-200 py-10 text-center text-base text-ink-400">
          {{ t('tool.noTrafficYet') }}
        </p>
      </div>

      <div id="section-alternatives" class="scroll-mt-32">
        <h2 class="text-[28px] font-bold leading-tight text-ink-900">{{ t('tool.alternatives') }} {{ tool.name }}</h2>
        <AdBanner v-if="alternativesAd" :ad="alternativesAd" placement="tool" class="mt-6" />
        <div v-if="alternatives.length" class="mt-6 grid grid-cols-1 gap-6 rounded-2xl border border-ink-100 bg-white p-4 sm:p-6 md:grid-cols-2 xl:grid-cols-3">
          <div
            v-for="alt in alternatives"
            :key="alt.slug"
            class="flex flex-col overflow-hidden rounded-xl border border-ink-100 bg-white shadow-[0_2px_10px_rgba(23,18,26,.06)] transition hover:border-brand-300 hover:shadow-[0_12px_28px_-16px_rgba(23,18,26,.35)]"
          >
            <NuxtLinkLocale :to="`/tools/${alt.slug}`" class="block h-[220px] bg-gradient-to-b from-[#FEDCD3] to-[#FFF3F0] px-8 pt-9">
              <img
                v-if="alt.screenshotUrl"
                :src="sizedImage(alt.screenshotUrl, 480)"
                :alt="alt.name"
                loading="lazy"
                class="h-full w-full rounded-t-md object-cover object-top shadow-sm"
              >
              <div v-else class="flex h-full w-full items-center justify-center rounded-t-md bg-white/70">
                <img data-logo v-if="alt.logoUrl" :src="sizedImage(alt.logoUrl, 80, 80)" :alt="alt.name" loading="lazy" class="h-20 w-20 rounded-2xl object-cover">
                <span v-else class="text-4xl font-extrabold text-brand-500">{{ alt.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'AI' }}</span>
              </div>
            </NuxtLinkLocale>
            <div class="flex flex-1 flex-col p-6">
              <div class="flex items-start justify-between gap-3">
                <NuxtLinkLocale :to="`/tools/${alt.slug}`" class="truncate text-2xl font-bold text-ink-900 hover:text-brand-600">{{ alt.name }}</NuxtLinkLocale>
                <span class="mt-1 flex shrink-0 items-center gap-1.5 text-base text-ink-700">
                  <svg class="h-5 w-5 text-ink-300" viewBox="0 0 20 20" fill="currentColor"><path d="M9.05 2.93c.3-.92 1.6-.92 1.9 0l1.07 3.29a1 1 0 00.95.69h3.46c.97 0 1.37 1.24.59 1.81l-2.8 2.03a1 1 0 00-.36 1.12l1.07 3.29c.3.92-.76 1.69-1.54 1.12l-2.8-2.03a1 1 0 00-1.18 0l-2.8 2.03c-.78.57-1.84-.2-1.54-1.12l1.07-3.29a1 1 0 00-.36-1.12L2.98 8.72c-.78-.57-.38-1.81.59-1.81h3.46a1 1 0 00.95-.69l1.07-3.29z" /></svg>
                  {{ alt.reviewCount }}
                </span>
              </div>
              <p class="mt-3 line-clamp-3 min-h-[4.5rem] text-base leading-relaxed text-ink-500">{{ alt.shortDesc || alt.categories?.map(c => c.name).join(', ') }}</p>
              <div class="mt-4 flex flex-wrap gap-2">
                <span class="rounded-full bg-ink-50 px-2.5 py-1 text-sm text-ink-700">{{ t(`pricing.${alt.pricingType}`) }}</span>
                <span v-for="c in (alt.categories ?? []).slice(0, 4)" :key="c.slug" class="rounded-full bg-ink-50 px-2.5 py-1 text-sm text-ink-700">{{ c.name }}</span>
              </div>
              <div class="mt-auto flex items-center justify-between gap-3 pt-6">
                <a
                  v-if="alt.website"
                  :href="alt.website"
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  @click="track(alt.slug, 'visit')"
                  @auxclick="track(alt.slug, 'visit')"
                  class="rounded-full border border-brand-500 px-8 py-2 text-base text-brand-600 transition hover:bg-brand-50"
                >
                  {{ t('tool.openSite') }}
                </a>
                <NuxtLinkLocale v-else :to="`/tools/${alt.slug}`" class="rounded-full border border-brand-500 px-8 py-2 text-base text-brand-600 transition hover:bg-brand-50">
                  {{ t('tool.openSite') }}
                </NuxtLinkLocale>
                <span class="flex items-center gap-1.5 text-sm text-ink-700" :title="t('tool.monthlyVisits')">
                  <svg class="h-4 w-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12h3l3-7 4 14 3-7h5" /></svg>
                  {{ alt.monthlyVisits ? formatCompact(alt.monthlyVisits) : '--' }}
                </span>
              </div>
            </div>
          </div>
        </div>
        <p v-else class="mt-6 rounded-xl border border-dashed border-ink-200 py-10 text-center text-base text-ink-400">
          {{ t('empty.noResults') }}
        </p>
      </div>
    </div>
  </div>
  </div>
</template>
