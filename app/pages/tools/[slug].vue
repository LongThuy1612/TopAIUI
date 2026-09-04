<script setup lang="ts">
import type { Tool, ToolsResponse } from '~/types'

const { t, locale } = useI18n()
const route = useRoute()
const slug = computed(() => String(route.params.slug))

const { data: tool, error } = await useFetch<Tool>(() => `/api/tools/${slug.value}`)

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Tool not found' })
}

const category = computed(() => tool.value?.categories?.[0])

const { data: alternativesRes } = await useFetch<ToolsResponse>('/api/tools', {
  query: computed(() => ({ category: category.value?.slug, limit: 6 }))
})
const alternatives = computed(() => (alternativesRes.value?.items ?? []).filter(item => item.slug !== slug.value))

const initials = computed(() => tool.value?.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'AI')

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

const addedOn = computed(() => {
  if (!tool.value?.createdAt) return '—'
  return new Date(tool.value.createdAt).toLocaleDateString(locale.value === 'vi' ? 'vi-VN' : 'en-US', {
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

function toggleSaved() {
  const favorites = new Set(readFavorites())
  if (favorites.has(slug.value)) {
    favorites.delete(slug.value)
  } else {
    favorites.add(slug.value)
  }
  localStorage.setItem(favoritesKey, JSON.stringify([...favorites]))
  isSaved.value = favorites.has(slug.value)
}

type TabKey = 'info' | 'pricing' | 'reviews' | 'analytics' | 'alternatives'
const tabs = computed<{ key: TabKey; id: string; label: string }[]>(() => [
  { key: 'info', id: 'section-info', label: t('tool.tabProductInfo') },
  { key: 'pricing', id: 'section-pricing', label: t('tool.tabPricing') },
  { key: 'reviews', id: 'section-reviews', label: t('tool.tabReviews') },
  { key: 'analytics', id: 'section-analytics', label: t('tool.tabAnalytics') },
  { key: 'alternatives', id: 'section-alternatives', label: t('tool.tabAlternatives') }
])
const activeTab = ref<TabKey>('info')

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

let sectionObserver: IntersectionObserver | null = null
onMounted(() => {
  if (!import.meta.client) return
  sectionObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) activeTab.value = entry.target.id.replace('section-', '') as TabKey
    }
  }, { rootMargin: '-140px 0px -65% 0px', threshold: 0 })
  for (const tab of tabs.value) {
    const el = document.getElementById(tab.id)
    if (el) sectionObserver.observe(el)
  }
})
onBeforeUnmount(() => sectionObserver?.disconnect())

useSeoMeta({
  title: () => `${tool.value?.name} — Topainew`
})
</script>

<template>
  <div v-if="tool" class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
    <nav class="flex flex-wrap items-center gap-1.5 text-sm text-ink-400">
      <NuxtLink to="/" class="hover:text-brand-600">Topainew</NuxtLink>
      <template v-if="category">
        <span>›</span>
        <NuxtLink :to="`/category/${category.slug}`" class="hover:text-brand-600">{{ category.name }}</NuxtLink>
      </template>
      <span>›</span>
      <span class="text-ink-600">{{ tool.name }}</span>
    </nav>

    <div class="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
      <div>
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="flex items-center gap-3">
            <div v-if="tool.logoUrl" class="h-12 w-12 shrink-0 overflow-hidden rounded-xl">
              <img :src="tool.logoUrl" :alt="tool.name" class="h-full w-full object-cover">
            </div>
            <div v-else class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-base font-bold text-white">
              {{ initials }}
            </div>
            <div>
              <h1 class="text-2xl font-extrabold text-ink-900">{{ tool.name }}</h1>
              <span v-if="tool.isFeatured" class="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-amber-600">★ {{ t('tool.featured') }}</span>
            </div>
            <a
              v-if="tool.website"
              :href="tool.website"
              target="_blank"
              rel="noopener noreferrer nofollow"
              class="ml-2 inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H18m0 0v4.5M18 6l-7.5 7.5M6 6.75h3M6 12h3m-3 5.25h9a1.5 1.5 0 001.5-1.5V13.5" /></svg>
              {{ t('tool.openSite') }}
            </a>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              :class="[
                'flex h-9 w-9 items-center justify-center rounded-full border transition',
                isSaved ? 'border-brand-300 bg-brand-50 text-brand-600' : 'border-ink-200 text-ink-400 hover:border-brand-300 hover:text-brand-600'
              ]"
              :title="isSaved ? t('tool.saved') : t('tool.save')"
              @click="toggleSaved"
            >
              <svg class="h-4 w-4" :fill="isSaved ? 'currentColor' : 'none'" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.563.563 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>
            </button>
            <a
              :href="twitterShareUrl"
              target="_blank"
              rel="noopener noreferrer"
              title="Twitter / X"
              class="flex h-9 w-9 items-center justify-center rounded-full border border-ink-200 text-xs font-bold text-ink-500 transition hover:border-brand-300 hover:text-brand-600"
            >𝕏</a>
            <a
              :href="facebookShareUrl"
              target="_blank"
              rel="noopener noreferrer"
              title="Facebook"
              class="flex h-9 w-9 items-center justify-center rounded-full border border-ink-200 text-sm font-bold text-ink-500 transition hover:border-brand-300 hover:text-brand-600"
            >f</a>
          </div>
        </div>

        <dl class="mt-5 space-y-2 text-sm">
          <div class="flex gap-2">
            <dt class="w-32 shrink-0 font-semibold text-ink-900">{{ t('tool.addedOn') }}:</dt>
            <dd class="text-ink-600">{{ addedOn }}</dd>
          </div>
          <div class="flex gap-2">
            <dt class="w-32 shrink-0 font-semibold text-ink-900">{{ t('tool.monthlyVisitors') }}:</dt>
            <dd class="text-ink-600">{{ tool.monthlyVisits ? tool.monthlyVisits.toLocaleString() : '—' }}</dd>
          </div>
        </dl>

        <div class="mt-4 flex flex-wrap gap-2">
          <span :class="['rounded-full border px-3 py-1.5 text-xs font-semibold', pricingStyle[tool.pricingType], 'border-transparent']">{{ t(`pricing.${tool.pricingType}`) }}</span>
          <NuxtLink v-if="category" :to="`/category/${category.slug}`" class="rounded-full border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-600 hover:border-brand-300 hover:text-brand-700">
            {{ category.name }}
          </NuxtLink>
          <span v-for="badge in badges" :key="badge.label" :class="['rounded-full px-3 py-1.5 text-xs font-semibold', badge.style]">
            {{ badge.label }}
          </span>
        </div>
      </div>

      <div v-if="tool.screenshotUrl">
        <img
          :src="tool.screenshotUrl"
          :alt="`${tool.name} screenshot`"
          class="aspect-video w-full rounded-xl border border-ink-100 object-cover shadow-sm"
        >
      </div>
    </div>

    <div class="sticky top-16 z-30 mt-8 border-b border-ink-100 bg-white/95 backdrop-blur">
      <nav class="-mb-px flex gap-6 overflow-x-auto">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          :class="[
            'shrink-0 border-b-2 px-1 pb-3 text-sm font-semibold transition',
            activeTab === tab.key ? 'border-brand-500 text-brand-600' : 'border-transparent text-ink-500 hover:text-ink-800'
          ]"
          @click="scrollToSection(tab.id)"
        >
          {{ tab.label }}
        </button>
      </nav>
    </div>

    <div v-if="alternatives.length" class="mt-5">
      <p class="text-xs font-semibold uppercase tracking-wide text-ink-400">{{ t('tool.similarTools') }}</p>
      <div class="mt-2 flex gap-3 overflow-x-auto pb-1">
        <NuxtLink
          v-for="alt in alternatives"
          :key="alt.slug"
          :to="`/tools/${alt.slug}`"
          class="flex w-60 shrink-0 items-start gap-2.5 rounded-xl border border-ink-100 bg-white p-3 shadow-sm transition hover:border-brand-200 hover:shadow-md"
        >
          <div v-if="alt.logoUrl" class="h-9 w-9 shrink-0 overflow-hidden rounded-lg">
            <img :src="alt.logoUrl" :alt="alt.name" class="h-full w-full object-cover">
          </div>
          <div v-else class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white">
            {{ alt.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'AI' }}
          </div>
          <p class="min-w-0 truncate text-sm font-semibold text-ink-900">{{ alt.name }}</p>
        </NuxtLink>
      </div>
    </div>

    <div class="mt-6 space-y-10">
      <div id="section-info" class="scroll-mt-32">
        <h2 class="text-xl font-extrabold text-ink-900">{{ t('tool.productInformationHeading', { name: tool.name }) }}</h2>
        <div class="mt-4 divide-y divide-ink-100 rounded-xl border border-ink-100 bg-white p-6 shadow-sm">
          <section class="pb-6">
            <dl class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div v-if="tool.affiliateUrl" class="flex gap-2 text-sm">
                <dt class="font-semibold text-ink-900">{{ t('tool.affiliateLink') }}:</dt>
                <dd class="truncate text-ink-600">{{ tool.affiliateUrl }}</dd>
              </div>
              <div v-if="tool.couponCode" class="flex gap-2 text-sm">
                <dt class="font-semibold text-ink-900">{{ t('tool.couponCode') }}:</dt>
                <dd class="text-ink-600">{{ tool.couponCode }}</dd>
              </div>
            </dl>
            <div class="mt-4 flex flex-wrap gap-3 text-sm">
              <a v-if="tool.twitterUrl" :href="tool.twitterUrl" target="_blank" rel="noopener noreferrer" class="text-brand-600 hover:text-brand-700">Twitter / X ↗</a>
              <a v-if="tool.discordUrl" :href="tool.discordUrl" target="_blank" rel="noopener noreferrer" class="text-brand-600 hover:text-brand-700">Discord ↗</a>
              <a v-if="tool.productHuntUrl" :href="tool.productHuntUrl" target="_blank" rel="noopener noreferrer" class="text-brand-600 hover:text-brand-700">Product Hunt ↗</a>
            </div>
          </section>
        </div>
      </div>

      <div id="section-pricing" class="scroll-mt-32">
        <h2 class="text-xl font-extrabold text-ink-900">{{ t('tool.pricingHeading', { name: tool.name }) }}</h2>
        <div class="mt-4 rounded-xl border border-ink-100 bg-white p-6 shadow-sm">
          <span :class="['inline-block rounded-full px-3 py-1.5 text-sm font-semibold', pricingStyle[tool.pricingType]]">{{ t(`pricing.${tool.pricingType}`) }}</span>
          <p v-if="tool.couponCode" class="mt-3 text-sm text-ink-600">{{ t('tool.couponCode') }}: <span class="font-semibold text-ink-900">{{ tool.couponCode }}</span></p>
        </div>
      </div>

      <div id="section-reviews" class="scroll-mt-32">
        <h2 class="text-xl font-extrabold text-ink-900">{{ t('tool.reviewsHeading', { name: tool.name, count: tool.reviewCount }) }}</h2>
        <div class="mt-4 rounded-xl border border-ink-100 bg-white p-6 shadow-sm">
          <div class="flex items-center gap-4">
            <p class="text-3xl font-extrabold text-ink-900">{{ tool.averageRating.toFixed(1) }}</p>
            <div>
              <div class="flex gap-1 text-lg text-amber-400">
                <span v-for="i in 5" :key="i">{{ i <= Math.round(tool.averageRating) ? '★' : '☆' }}</span>
              </div>
              <p class="mt-1 text-xs text-ink-400">{{ tool.ratingCount }} {{ t('tool.ratings') }} · {{ tool.upvoteCount }} {{ t('tool.upvotes') }}</p>
            </div>
          </div>
          <textarea
            disabled
            :placeholder="t('tool.whatDoYouThink')"
            class="mt-4 w-full resize-none rounded-lg border border-ink-200 bg-ink-100/30 p-3 text-sm text-ink-400 outline-none"
            rows="3"
          />
          <button type="button" disabled class="mt-3 cursor-not-allowed rounded-lg bg-ink-200 px-4 py-2 text-sm font-semibold text-ink-500">
            {{ t('tool.loginToComment') }}
          </button>
        </div>
      </div>

      <div id="section-analytics" class="scroll-mt-32">
        <h2 class="text-xl font-extrabold text-ink-900">{{ t('tool.analyticsHeading', { name: tool.name }) }}</h2>
        <div class="mt-4 rounded-xl border border-ink-100 bg-white p-6 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wide text-ink-400">{{ t('tool.visitOverTime') }}</p>
          <dl class="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <dt class="text-xs text-ink-400">{{ t('tool.monthlyVisits') }}</dt>
              <dd class="mt-1 text-lg font-bold text-ink-900">{{ tool.monthlyVisits.toLocaleString() }}</dd>
            </div>
            <div>
              <dt class="text-xs text-ink-400">{{ t('tool.domainAuthority') }}</dt>
              <dd class="mt-1 text-lg font-bold text-ink-900">{{ tool.domainAuthority }}</dd>
            </div>
            <div>
              <dt class="text-xs text-ink-400">{{ t('tool.trafficRank') }}</dt>
              <dd class="mt-1 text-lg font-bold text-ink-900">{{ tool.trafficRank ? `#${tool.trafficRank}` : '—' }}</dd>
            </div>
            <div>
              <dt class="text-xs text-ink-400">{{ t('tool.viewCount') }}</dt>
              <dd class="mt-1 text-lg font-bold text-ink-900">{{ tool.viewCount.toLocaleString() }}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div id="section-alternatives" class="scroll-mt-32">
        <h2 class="text-xl font-extrabold text-ink-900">{{ t('tool.alternatives') }} {{ tool.name }}</h2>
        <div v-if="alternatives.length" class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ToolCard v-for="alt in alternatives" :key="alt.slug" :tool="alt" />
        </div>
        <p v-else class="mt-4 rounded-xl border border-dashed border-ink-200 py-10 text-center text-sm text-ink-400">
          {{ t('empty.noResults') }}
        </p>
      </div>
    </div>

    <NuxtLink v-if="category" :to="`/category/${category.slug}`" class="mt-10 inline-block text-sm font-semibold text-brand-600 hover:text-brand-700">
      ← {{ t('tool.backToCategory') }} {{ category.name }}
    </NuxtLink>
  </div>
</template>
