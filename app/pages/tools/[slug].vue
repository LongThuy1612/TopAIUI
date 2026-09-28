<script setup lang="ts">
import type { Review, ReviewsResponse, Tool, ToolsResponse } from '~/types'

const { t, locale } = useI18n()
const route = useRoute()
const slug = computed(() => String(route.params.slug))

const { data: tool, error } = await useFetch<Tool>(() => `/api/tools/${slug.value}`, {
  query: computed(() => ({ locale: locale.value }))
})

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Tool not found' })
}

const category = computed(() => tool.value?.categories?.[0])

// Crawled tools usually have no screenshotUrl, so fall back to the first
// entry of `images` (string or { url }), then to the logo.
const heroImage = computed(() => {
  const t = tool.value
  if (!t) return undefined
  if (t.screenshotUrl) return t.screenshotUrl
  const first = Array.isArray(t.images) ? t.images[0] : undefined
  const fromImages = typeof first === 'string' ? first : (first as { url?: string } | undefined)?.url
  return fromImages || t.logoUrl || undefined
})

const { data: alternativesRes } = await useFetch<ToolsResponse>('/api/tools', {
  query: computed(() => ({ category: category.value?.slug, limit: 6, locale: locale.value }))
})
const alternatives = computed(() => (alternativesRes.value?.items ?? []).filter(item => item.slug !== slug.value))

const initials = computed(() => tool.value?.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'AI')

const reviewsSort = ref<'newest' | 'oldest'>('newest')
const reviewsPage = ref(1)
const reviewsLoading = ref(false)

const { data: reviewsRes } = await useFetch<ReviewsResponse>(() => `/api/tools/${slug.value}/reviews`, {
  query: { page: 1, limit: 10, sort: 'newest' }
})
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
  const items = await fetchReviews(nextPage, reviewsSort.value)
  reviews.value.push(...items)
  reviewsPage.value = nextPage
}

async function changeReviewsSort(sort: 'newest' | 'oldest') {
  reviewsSort.value = sort
  reviewsPage.value = 1
  reviews.value = await fetchReviews(1, sort)
}

function formatReviewDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString(locale.value === 'vi' ? 'vi-VN' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric' }).replace(',', '')
}

const pricingStyle: Record<string, string> = {
  FREE: 'bg-emerald-50 text-emerald-700',
  FREEMIUM: 'bg-brand-50 text-brand-700',
  PAID: 'bg-amber-50 text-amber-700'
}

const badges = computed(() => {
  if (!tool.value) return []
  return [
    tool.value.isVerified && { label: t('tool.badgeVerified'), style: 'bg-blue-50 text-blue-700' },
    tool.value.isJustLaunched && { label: t('tool.badgeJustLaunched'), style: 'bg-purple-50 text-purple-700' },
    tool.value.isFreeTool && { label: t('tool.badgeFreeTool'), style: 'bg-emerald-50 text-emerald-700' }
  ].filter(Boolean) as { label: string; style: string }[]
})

const displayRating = computed(() => (tool.value?.reviewCount ? tool.value.averageRating : 5))

const { user, load: loadAuth } = useAuth()
const isLoggedIn = computed(() => !!user.value)
const userName = computed(() => user.value?.name || user.value?.email || null)

const newRating = ref(0)
const newRatingHover = ref(0)
const newComment = ref('')
const reviewSubmitAttempted = ref(false)
const canSubmitReview = computed(() => newComment.value.trim().length > 0)
const reviewDraftKey = computed(() => `topainew:review-draft:${slug.value}`)

function loadReviewDraft() {
  if (!import.meta.client) return
  try {
    const raw = localStorage.getItem(reviewDraftKey.value)
    if (!raw) return
    const draft = JSON.parse(raw) as { rating?: number; comment?: string }
    newRating.value = draft.rating ?? 0
    newComment.value = draft.comment ?? ''
  } catch {
    // ignore corrupt draft
  }
}

function saveReviewDraft() {
  if (!import.meta.client) return
  localStorage.setItem(reviewDraftKey.value, JSON.stringify({ rating: newRating.value, comment: newComment.value }))
}

function clearReviewDraft() {
  if (import.meta.client) localStorage.removeItem(reviewDraftKey.value)
}

watch([newRating, newComment], saveReviewDraft)

onMounted(() => {
  loadAuth()
  loadReviewDraft()
})

function goToLoginToReview() {
  saveReviewDraft()
  navigateTo(`/login?redirect=${encodeURIComponent(route.fullPath)}`)
}

function submitNewReview() {
  reviewSubmitAttempted.value = true
  if (!canSubmitReview.value) return
  reviews.value.unshift({
    rating: newRating.value || 5,
    comment: newComment.value.trim(),
    createdAt: new Date().toISOString(),
    userName: userName.value
  })
  reviewsTotal.value += 1
  newRating.value = 0
  newComment.value = ''
  reviewSubmitAttempted.value = false
  clearReviewDraft()
}

const addedOn = computed(() => {
  const date = tool.value?.addedOn ?? tool.value?.createdAt
  if (!date) return '—'
  return new Date(date).toLocaleDateString(locale.value === 'vi' ? 'vi-VN' : 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  })
})

const requestUrl = useRequestURL()
const shareUrl = computed(() => requestUrl.href)
const twitterShareUrl = computed(() => `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl.value)}&text=${encodeURIComponent(tool.value?.name ?? '')}`)
const facebookShareUrl = computed(() => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl.value)}`)

const isSaved = ref(false)
const favoritesKey = 'topainew:favorites'

function readFavorites(): string[] {
  try {
    return JSON.parse(localStorage.getItem(favoritesKey) ?? '[]')
  } catch {
    return []
  }
}

onMounted(() => {
  if (import.meta.client) isSaved.value = readFavorites().includes(slug.value)
})

function writeFavorites(nextSaved: boolean) {
  const favorites = new Set(readFavorites())
  if (nextSaved) {
    favorites.add(slug.value)
  } else {
    favorites.delete(slug.value)
  }
  localStorage.setItem(favoritesKey, JSON.stringify([...favorites]))
  isSaved.value = nextSaved
}

async function toggleSaved() {
  const nextSaved = !isSaved.value
  const previousCount = tool.value?.collectionCount ?? 0

  writeFavorites(nextSaved)
  if (tool.value) tool.value.collectionCount = Math.max(0, previousCount + (nextSaved ? 1 : -1))

  try {
    const res = await $fetch<{ collectionCount: number }>(`/api/tools/${slug.value}/save`, {
      method: 'POST',
      body: { saved: nextSaved }
    })
    if (tool.value) tool.value.collectionCount = res.collectionCount
  } catch {
    writeFavorites(!nextSaved)
    if (tool.value) tool.value.collectionCount = previousCount
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

useSeoMeta({
  title: () => `${tool.value?.name} — TopAICollection`
})
</script>

<template>
  <div v-if="tool" class="bg-[linear-gradient(180deg,#FDF2F8_0px,#FFFFFF_520px)]">
  <div class="mx-auto max-w-[1300px] px-4 py-8 sm:px-6 lg:px-8">
    <nav class="flex flex-wrap items-center gap-2 text-base text-ink-900">
      <NuxtLink to="/" class="hover:text-brand-600">Home</NuxtLink>
      <template v-if="category">
        <svg class="h-3.5 w-3.5 text-ink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
        <NuxtLink :to="`/category/${category.slug}`" class="hover:text-brand-600">{{ category.name }}</NuxtLink>
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
          <div v-if="tool.twitterUrl || tool.discordUrl || tool.productHuntUrl" class="flex items-center gap-4">
            <dt class="w-[130px] shrink-0 whitespace-nowrap font-bold text-ink-900">{{ t('tool.socialAndEmail') }}:</dt>
            <dd class="flex items-center gap-2">
              <a v-if="tool.twitterUrl" :href="tool.twitterUrl" target="_blank" rel="noopener noreferrer" title="Twitter / X" class="flex h-6 w-6 items-center justify-center rounded-full bg-ink-900 text-xs font-bold text-white hover:bg-brand-500">𝕏</a>
              <a v-if="tool.discordUrl" :href="tool.discordUrl" target="_blank" rel="noopener noreferrer" title="Discord" class="flex h-6 w-6 items-center justify-center rounded-full bg-[#5865F2] text-[10px] font-bold text-white hover:opacity-80">D</a>
              <a v-if="tool.productHuntUrl" :href="tool.productHuntUrl" target="_blank" rel="noopener noreferrer" title="Product Hunt" class="flex h-6 w-6 items-center justify-center rounded-full bg-[#DA552F] text-xs font-bold text-white hover:opacity-80">P</a>
            </dd>
          </div>
        </dl>

        <div class="mt-7 flex flex-wrap gap-3">
          <span class="rounded-full border border-ink-300 bg-white px-3 py-1 text-sm text-ink-900">{{ t(`pricing.${tool.pricingType}`) }}</span>
          <NuxtLink
            v-for="cat in tool.categories ?? []"
            :key="cat.slug"
            :to="`/category/${cat.slug}`"
            class="rounded-full border border-brand-200 bg-white px-3 py-1 text-sm text-brand-500 hover:border-brand-400"
          >
            {{ cat.name }}
          </NuxtLink>
          <span v-for="badge in badges" :key="badge.label" :class="['rounded-full px-3 py-1 text-sm', badge.style]">
            {{ badge.label }}
          </span>
        </div>
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

        <img
          v-if="heroImage"
          :src="heroImage"
          :alt="`${tool.name} screenshot`"
          class="mt-6 aspect-video w-full rounded object-cover shadow-[0_2px_12px_rgba(0,0,0,0.12)]"
        >

        <div class="mt-3 flex justify-end gap-4">
          <NuxtLink to="/admin/advertise" class="rounded bg-brand-500 px-3 py-2 text-sm text-white transition hover:bg-brand-600">
            {{ t('tool.advertiseTool') }}
          </NuxtLink>
          <NuxtLink to="/submit" class="rounded border border-brand-500 bg-white px-3 py-2 text-sm text-brand-500 transition hover:bg-brand-50">
            {{ t('tool.updateTool') }}
          </NuxtLink>
        </div>
      </div>
    </div>

    <div class="sticky top-[73px] z-30 mt-6 border-b border-ink-200 bg-white/95 backdrop-blur">
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
      <NuxtLink
        v-for="alt in alternatives.slice(0, 5)"
        :key="alt.slug"
        :to="`/tools/${alt.slug}`"
        class="min-w-0 rounded-xl border-2 border-brand-100 bg-white px-4 py-4 transition hover:border-brand-300"
      >
        <div class="flex items-center gap-2.5">
          <div v-if="alt.logoUrl" class="h-7 w-7 shrink-0 overflow-hidden rounded-full">
            <img :src="alt.logoUrl" :alt="alt.name" class="h-full w-full object-cover">
          </div>
          <div v-else class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-[10px] font-bold text-white">
            {{ alt.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'AI' }}
          </div>
          <p class="min-w-0 truncate text-base font-bold text-ink-900">{{ alt.name }}</p>
        </div>
        <p v-if="alt.shortDesc" class="mt-2.5 line-clamp-2 text-sm leading-snug text-ink-900">{{ alt.shortDesc }}</p>
      </NuxtLink>
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
              <span v-for="tag in tool.tags" :key="tag.slug" class="rounded-full bg-ink-100 px-3 py-1 text-sm text-ink-700">#{{ tag.name }}</span>
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
              <a v-if="tool.productHuntUrl" :href="tool.productHuntUrl" target="_blank" rel="noopener noreferrer" class="text-brand-600 hover:text-brand-700">Product Hunt ↗</a>
            </div>
          </section>
        </div>
      </div>

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
              :disabled="!canSubmitReview"
              class="mt-3 rounded-lg px-4 py-2 text-base font-semibold transition"
              :class="canSubmitReview ? 'bg-brand-500 text-white hover:bg-brand-600' : 'cursor-not-allowed bg-ink-200 text-ink-500'"
              @click="submitNewReview"
            >
              {{ t('tool.submitReview') }}
            </button>
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
        <div class="mt-6 rounded-lg border border-ink-200 bg-white p-7">
          <p class="text-xs font-semibold uppercase tracking-wide text-ink-400">{{ t('tool.visitOverTime') }}</p>
          <dl class="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <dt class="text-sm text-ink-500">{{ t('tool.monthlyVisits') }}</dt>
              <dd class="mt-1 text-xl font-bold text-ink-900">{{ tool.monthlyVisits.toLocaleString() }}</dd>
            </div>
            <div>
              <dt class="text-sm text-ink-500">{{ t('tool.domainAuthority') }}</dt>
              <dd class="mt-1 text-xl font-bold text-ink-900">{{ tool.domainAuthority }}</dd>
            </div>
            <div>
              <dt class="text-sm text-ink-500">{{ t('tool.trafficRank') }}</dt>
              <dd class="mt-1 text-xl font-bold text-ink-900">{{ tool.trafficRank ? `#${tool.trafficRank}` : '—' }}</dd>
            </div>
            <div>
              <dt class="text-sm text-ink-500">{{ t('tool.viewCount') }}</dt>
              <dd class="mt-1 text-xl font-bold text-ink-900">{{ tool.viewCount.toLocaleString() }}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div id="section-alternatives" class="scroll-mt-32">
        <h2 class="text-[28px] font-bold leading-tight text-ink-900">{{ t('tool.alternatives') }} {{ tool.name }}</h2>
        <div v-if="alternatives.length" class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ToolCard v-for="alt in alternatives" :key="alt.slug" :tool="alt" />
        </div>
        <p v-else class="mt-6 rounded-xl border border-dashed border-ink-200 py-10 text-center text-base text-ink-400">
          {{ t('empty.noResults') }}
        </p>
      </div>
    </div>

    <NuxtLink v-if="category" :to="`/category/${category.slug}`" class="mt-10 inline-block text-base font-semibold text-brand-600 hover:text-brand-700">
      ← {{ t('tool.backToCategory') }} {{ category.name }}
    </NuxtLink>
  </div>
  </div>
</template>
