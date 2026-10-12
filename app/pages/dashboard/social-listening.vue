<script setup lang="ts">
const { t, locale } = useI18n()
const { authHeaders } = useAuth()
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

import { NuxtLinkLocale } from '#components'

interface SocialTool {
  slug: string
  hasPage: boolean
  name: string
  website: string | null
  logo: string | null
  intro: string | null
  categories: { slug: string; name: string }[]
  videoCount: number
  creatorsCount: number
  monthlyTraffic: number
  avgViews: number
  avgInteractions: number
  totalViews: number
  totalInteractions: number
}

interface SocialResponse {
  categories: { slug: string; name: string }[]
  total: number
  page: number
  pageCount: number
  items: SocialTool[]
}

type SortKey = 'videoCount' | 'creatorsCount' | 'monthlyTraffic' | 'avgViews' | 'avgInteractions' | 'totalViews' | 'totalInteractions'

const PAGE_SIZE = 50
const activeCategory = ref('')
const search = ref('')
const sortKey = ref<SortKey>('videoCount')
const sortDir = ref<'asc' | 'desc'>('desc')
const page = ref(1)

// Only query the server once typing pauses.
const debouncedSearch = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(search, (value) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { debouncedSearch.value = value.trim() }, 300)
})
onBeforeUnmount(() => { if (searchTimer) clearTimeout(searchTimer) })

// Any filter change starts again from the first page.
watch([activeCategory, debouncedSearch, sortKey, sortDir, locale], () => { page.value = 1 })

const { data, pending, error } = await useFetch<SocialResponse>('/api/social-listening', {
  headers: () => authHeaders(),
  query: computed(() => ({
    category: activeCategory.value || undefined,
    q: debouncedSearch.value || undefined,
    sort: sortKey.value,
    dir: sortDir.value,
    page: page.value,
    limit: PAGE_SIZE,
    locale: locale.value
  }))
})

const tools = computed(() => data.value?.items ?? [])
const categories = computed(() => data.value?.categories ?? [])
const pageCount = computed(() => data.value?.pageCount ?? 0)

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'desc' ? 'asc' : 'desc'
  } else {
    sortKey.value = key
    sortDir.value = 'desc'
  }
}

function formatCompact(n: number) {
  return new Intl.NumberFormat(locale.value, { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

function initials(name: string) {
  return name.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase()
}

const avatarColors = ['bg-ink-900', 'bg-blue-500', 'bg-orange-500', 'bg-emerald-600', 'bg-violet-500', 'bg-sky-500', 'bg-red-600']
function avatarBg(name: string) {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return avatarColors[h % avatarColors.length]
}

const brokenLogos = ref(new Set<string>())

const sortColumns: { key: SortKey; labelKey: string }[] = [
  { key: 'videoCount', labelKey: 'colVideoCount' },
  { key: 'creatorsCount', labelKey: 'colCreatorsCount' },
  { key: 'monthlyTraffic', labelKey: 'colMonthlyTraffic' },
  { key: 'avgViews', labelKey: 'colAvgViews' },
  { key: 'avgInteractions', labelKey: 'colAvgInteractions' },
  { key: 'totalViews', labelKey: 'colTotalViews' },
  { key: 'totalInteractions', labelKey: 'colTotalInteractions' }
]

useSeoMeta({
  title: () => `${t('socialListening.title')} — TopAICollection`
})
</script>

<template>
  <div>
    <h1 class="flex items-center gap-2 text-xl font-extrabold text-ink-900">
      <span>💬</span> {{ t('socialListening.title') }}
    </h1>

    <SocialQueries />
    <p class="mt-1 text-sm text-ink-900">{{ t('socialListening.subtitle') }}</p>

    <div class="mt-5 flex flex-wrap items-center gap-3">
      <select v-model="activeCategory" class="rounded-lg border border-ink-200 px-3 py-2 text-sm font-semibold text-ink-900 outline-none focus:border-brand-400">
        <option value="">{{ t('socialListening.allCategories') }}</option>
        <option v-for="c in categories" :key="c.slug" :value="c.slug">{{ c.name }}</option>
      </select>
      <div class="relative">
        <input
          v-model="search"
          type="text"
          :placeholder="t('socialListening.searchPlaceholder')"
          class="w-72 max-w-full rounded-lg border border-ink-200 py-2 pl-3 pr-9 text-sm outline-none focus:border-brand-400"
        >
        <svg class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-4.3-4.3M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />
        </svg>
      </div>
    </div>

    <div class="mt-5 overflow-x-auto rounded-xl border border-ink-100">
      <table class="w-full min-w-[1100px] text-left text-sm">
        <thead class="border-b border-ink-100 text-xs font-bold uppercase tracking-wide text-ink-900">
          <tr>
            <th class="px-4 py-3">{{ t('socialListening.colTool') }}</th>
            <th class="px-4 py-3">{{ t('socialListening.colIntroduce') }}</th>
            <th v-for="col in sortColumns" :key="col.key" class="px-4 py-3">
              <button type="button" class="flex items-center gap-1 hover:text-brand-600" @click="toggleSort(col.key)">
                {{ t(`socialListening.${col.labelKey}`) }}
                <svg class="h-3 w-3 shrink-0" fill="none" viewBox="0 0 20 20" stroke="currentColor" stroke-width="2.5">
                  <path v-if="sortKey === col.key && sortDir === 'asc'" stroke-linecap="round" stroke-linejoin="round" d="m5 12 5-5 5 5" />
                  <path v-else-if="sortKey === col.key && sortDir === 'desc'" stroke-linecap="round" stroke-linejoin="round" d="m5 8 5 5 5-5" />
                  <path v-else stroke-linecap="round" stroke-linejoin="round" d="M5 8.5 10 4l5 4.5M5 11.5 10 16l5-4.5" class="text-ink-300" />
                </svg>
              </button>
            </th>
          </tr>
        </thead>
        <tbody :class="pending && 'opacity-50'">
          <tr v-for="item in tools" :key="item.slug" class="border-t border-ink-100 hover:bg-ink-100/30">
            <td class="px-4 py-4">
              <!-- Tools listed here open their page; crawled-only ones open their website. -->
              <component
                :is="item.hasPage ? NuxtLinkLocale : (item.website ? 'a' : 'span')"
                v-bind="item.hasPage ? { to: `/tools/${item.slug}` } : (item.website ? { href: item.website, target: '_blank', rel: 'noopener noreferrer nofollow' } : {})"
                class="flex items-center gap-2.5 hover:opacity-80"
              >
                <img
                  v-if="item.logo && !brokenLogos.has(item.slug)"
                  :src="item.logo"
                  :alt="item.name"
                  class="h-10 w-10 shrink-0 rounded-full border border-ink-100 object-cover"
                  loading="lazy"
                  @error="brokenLogos = new Set(brokenLogos).add(item.slug)"
                >
                <span v-else :class="['flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white', avatarBg(item.name)]">{{ initials(item.name) }}</span>
                <span class="font-semibold text-ink-900 hover:text-brand-600">{{ item.name }}</span>
              </component>
            </td>
            <td class="max-w-[280px] truncate px-4 py-4 text-ink-900" :title="item.intro ?? ''">{{ item.intro ?? '—' }}</td>
            <td class="px-4 py-4 font-semibold text-brand-600">{{ formatCompact(item.videoCount) }}</td>
            <td class="px-4 py-4 text-ink-900">{{ formatCompact(item.creatorsCount) }}</td>
            <td class="px-4 py-4 text-ink-900">{{ formatCompact(item.monthlyTraffic) }}</td>
            <td class="px-4 py-4 text-ink-900">{{ formatCompact(item.avgViews) }}</td>
            <td class="px-4 py-4 text-ink-900">{{ formatCompact(item.avgInteractions) }}</td>
            <td class="px-4 py-4 text-ink-900">{{ formatCompact(item.totalViews) }}</td>
            <td class="px-4 py-4 text-ink-900">{{ formatCompact(item.totalInteractions) }}</td>
          </tr>
        </tbody>
      </table>

      <div v-if="error" class="py-16 text-center text-sm text-red-600">{{ t('websiteInsights.loadError') }}</div>
      <div v-else-if="pending && !tools.length" class="py-16 text-center text-sm text-ink-400">{{ t('websiteInsights.loading') }}</div>
      <div v-else-if="!tools.length" class="py-16 text-center text-sm text-ink-900">
        {{ t('socialListening.noResults') }}
      </div>
    </div>

    <div v-if="pageCount > 1" class="mt-4 flex items-center justify-end gap-3 text-sm">
      <button type="button" class="rounded-lg border border-ink-200 px-3 py-1.5 font-semibold text-ink-900 hover:border-brand-300 disabled:cursor-not-allowed disabled:opacity-40" :disabled="page <= 1" @click="page--">‹</button>
      <span class="text-ink-600">{{ page }} / {{ pageCount }}</span>
      <button type="button" class="rounded-lg border border-ink-200 px-3 py-1.5 font-semibold text-ink-900 hover:border-brand-300 disabled:cursor-not-allowed disabled:opacity-40" :disabled="page >= pageCount" @click="page++">›</button>
    </div>
  </div>
</template>
