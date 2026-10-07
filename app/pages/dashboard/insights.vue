<script setup lang="ts">
const { t, locale } = useI18n()
const { authHeaders } = useAuth()
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

interface InsightItem {
  slug: string
  name: string
  website: string | null
  domain: string | null
  logo: string | null
  categories: string[]
  monthlyVisits: number
  growth: number | null
  growthRate: number | null
  trend: (number | null)[]
  avgVisitDuration: number | null
  bounceRate: number | null
}

interface InsightsResponse {
  months: string[]
  month: string | null
  total: number
  page: number
  pageCount: number
  items: InsightItem[]
}

type SortOption = 'visits-desc' | 'visits-asc' | 'growth-desc' | 'growthRate-desc' | 'growthRate-asc'
const sortOptions: { value: SortOption; labelKey: string }[] = [
  { value: 'visits-desc', labelKey: 'sortVisitsDesc' },
  { value: 'visits-asc', labelKey: 'sortVisitsAsc' },
  { value: 'growth-desc', labelKey: 'sortGrowthDesc' },
  { value: 'growthRate-desc', labelKey: 'sortGrowthRateDesc' },
  { value: 'growthRate-asc', labelKey: 'sortGrowthRateAsc' }
]

const PAGE_SIZE = 50
// Empty until the user picks one: the server then answers with the latest
// month, which the dropdown shows as selected.
const month = ref('')
const sortOption = ref<SortOption>('visits-desc')
const page = ref(1)
const search = ref('')
// Only query the server once typing pauses.
const debouncedSearch = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(search, (value) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { debouncedSearch.value = value.trim() }, 300)
})
onBeforeUnmount(() => { if (searchTimer) clearTimeout(searchTimer) })

// Any filter change starts again from the first page.
watch([month, sortOption, debouncedSearch, locale], () => { page.value = 1 })

const { data, pending, error } = await useFetch<InsightsResponse>('/api/insights', {
  headers: authHeaders(),
  query: computed(() => {
    const [sort, dir] = sortOption.value.split('-') as [string, string]
    return {
      month: month.value || undefined,
      q: debouncedSearch.value || undefined,
      sort,
      dir,
      page: page.value,
      limit: PAGE_SIZE,
      locale: locale.value
    }
  })
})

const items = computed(() => data.value?.items ?? [])
const months = computed(() => data.value?.months ?? [])
const pageCount = computed(() => data.value?.pageCount ?? 0)
// From the response, not the page ref: while the next page loads the old rows
// stay on screen and must keep their own numbers.
const rankOffset = computed(() => ((data.value?.page ?? 1) - 1) * PAGE_SIZE)

// Selection survives paging/filtering, keyed by slug. The rows hold one
// month's figures, so a different month (or language) starts a new selection;
// otherwise an export would label old figures with the new month.
const selected = ref<Map<string, InsightItem>>(new Map())
watch([month, locale], () => { selected.value = new Map() })
const allOnPageSelected = computed(() => items.value.length > 0 && items.value.every(i => selected.value.has(i.slug)))

function toggleRow(item: InsightItem) {
  const next = new Map(selected.value)
  if (next.has(item.slug)) next.delete(item.slug)
  else next.set(item.slug, item)
  selected.value = next
}

function togglePage() {
  const next = new Map(selected.value)
  if (allOnPageSelected.value) items.value.forEach(i => next.delete(i.slug))
  else items.value.forEach(i => next.set(i.slug, i))
  selected.value = next
}

function bulkOpen() {
  const sites = [...selected.value.values()].map(i => i.website).filter((w): w is string => !!w)
  let blocked = false
  for (const url of sites) {
    // No 'noopener' feature here: with it window.open always returns null, so a
    // blocked tab couldn't be told apart. Cut the opener link by hand instead.
    const tab = window.open(url, '_blank')
    if (tab) tab.opener = null
    else blocked = true
  }
  if (blocked) alert(t('websiteInsights.popupBlocked'))
}

function csvCell(value: unknown) {
  let s = value === null || value === undefined ? '' : String(value)
  // Tool names are user-submitted: text starting with = + - @ would run as a
  // formula when the file is opened in Excel / Sheets, so neutralise it.
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// Exports the selected rows, or the current page when nothing is selected.
function exportCsv() {
  const rows = selected.value.size ? [...selected.value.values()] : items.value
  const header = ['Tool', 'Domain', 'Month', 'Monthly Visits', 'Growth', 'Growth Rate (%)', 'Categories', 'Avg Visit Duration (s)', 'Bounce Rate (%)']
  const lines = rows.map(r => [
    r.name, r.domain, data.value?.month, Math.round(r.monthlyVisits),
    r.growth === null ? '' : Math.round(r.growth),
    // Rounded as numbers, not toFixed() strings: csvCell would otherwise treat
    // a negative rate ("-10.14") as text and prefix it.
    r.growthRate === null ? '' : Math.round(r.growthRate * 100) / 100,
    r.categories.join('; '),
    r.avgVisitDuration === null ? '' : Math.round(r.avgVisitDuration),
    r.bounceRate === null ? '' : Math.round(r.bounceRate * 100) / 100
  ].map(csvCell).join(','))
  // BOM so Excel reads UTF-8 names correctly.
  const blob = new Blob([String.fromCharCode(0xFEFF) + [header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `website-insights-${data.value?.month ?? 'export'}.csv`
  a.click()
  // Revoking in the same tick can cancel the download in Firefox / Safari.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function formatCompact(n: number) {
  return new Intl.NumberFormat(locale.value, { notation: 'compact', maximumFractionDigits: 1 }).format(Math.abs(n))
}

function formatMonth(m: string) {
  return `${m.slice(5, 7)}/${m.slice(0, 4)}`
}

function formatDuration(seconds: number | null) {
  if (seconds === null) return '—'
  const s = Math.round(seconds)
  return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(n => String(n).padStart(2, '0')).join(':')
}

// Scaled into a 50×24 box; gaps (months without data) are skipped.
function sparkline(trend: (number | null)[]) {
  const points = trend.map((v, i) => ({ v, i })).filter((p): p is { v: number; i: number } => p.v !== null)
  if (points.length < 2) return ''
  const min = Math.min(...points.map(p => p.v)), max = Math.max(...points.map(p => p.v))
  const span = max - min || 1
  const stepX = 50 / Math.max(1, trend.length - 1)
  return points.map((p, j) => `${j ? 'L' : 'M'}${(p.i * stepX).toFixed(1)} ${(22 - (p.v - min) / span * 20).toFixed(1)}`).join(' ')
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

useSeoMeta({
  title: () => `${t('websiteInsights.title')} — TopAICollection`
})
</script>

<template>
  <div>
    <h1 class="flex items-center gap-2 text-xl font-extrabold text-ink-900">
      <span>📈</span> {{ t('websiteInsights.title') }}
    </h1>

    <div class="mt-5 flex flex-wrap items-center gap-3">
      <select :value="month || data?.month || ''" class="rounded-lg border border-ink-200 px-3 py-2 text-sm font-semibold text-ink-900 outline-none focus:border-brand-400" @change="month = ($event.target as HTMLSelectElement).value">
        <option v-for="m in months" :key="m" :value="m">{{ formatMonth(m) }}</option>
      </select>
      <div class="relative">
        <input
          v-model="search"
          type="text"
          :placeholder="t('websiteInsights.searchPlaceholder')"
          class="w-72 max-w-full rounded-lg border border-ink-200 py-2 pl-3 pr-9 text-sm outline-none focus:border-brand-400"
        >
        <svg class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-4.3-4.3M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />
        </svg>
      </div>
    </div>

    <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
      <button
        type="button"
        class="rounded-lg border border-brand-300 px-3 py-2 text-sm font-semibold text-brand-600 hover:bg-brand-50 disabled:cursor-not-allowed disabled:border-ink-200 disabled:text-ink-400 disabled:hover:bg-transparent"
        :disabled="!selected.size"
        @click="bulkOpen"
      >
        {{ t('websiteInsights.bulkOpen') }}<template v-if="selected.size"> ({{ selected.size }})</template>
      </button>
      <div class="flex items-center gap-3">
        <select v-model="sortOption" class="rounded-lg border border-ink-200 px-3 py-2 text-sm font-semibold text-ink-900 outline-none focus:border-brand-400">
          <option v-for="o in sortOptions" :key="o.value" :value="o.value">{{ t(`websiteInsights.${o.labelKey}`) }}</option>
        </select>
        <button
          type="button"
          class="rounded-lg bg-ink-900 px-3 py-2 text-sm font-semibold text-white hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="!items.length && !selected.size"
          @click="exportCsv"
        >
          {{ t('websiteInsights.export') }}
        </button>
      </div>
    </div>

    <div class="mt-5 overflow-x-auto rounded-xl border border-ink-100">
      <table class="w-full min-w-[1100px] text-left text-sm">
        <thead class="border-b border-ink-100 text-xs font-bold uppercase tracking-wide text-ink-900">
          <tr>
            <th class="w-10 px-4 py-3">
              <input type="checkbox" class="h-4 w-4 rounded border-ink-300" :checked="allOnPageSelected" :disabled="!items.length" @change="togglePage">
            </th>
            <th class="w-10 px-2 py-3">#</th>
            <th class="px-4 py-3">{{ t('websiteInsights.colTool') }}</th>
            <th class="px-4 py-3">{{ t('websiteInsights.colMonthlyVisits') }}</th>
            <th class="px-4 py-3">{{ t('websiteInsights.colGrowth') }}</th>
            <th class="px-4 py-3">{{ t('websiteInsights.colGrowthRate') }}</th>
            <th class="px-4 py-3">{{ t('websiteInsights.colCategory') }}</th>
            <th class="px-4 py-3">{{ t('websiteInsights.colAvgVisitDuration') }}</th>
            <th class="px-4 py-3">{{ t('websiteInsights.colAction') }}</th>
          </tr>
        </thead>
        <tbody :class="pending && 'opacity-50'">
          <tr v-for="(item, i) in items" :key="item.slug" class="border-t border-ink-100 hover:bg-ink-100/30">
            <td class="px-4 py-4">
              <input type="checkbox" class="h-4 w-4 rounded border-ink-300" :checked="selected.has(item.slug)" @change="toggleRow(item)">
            </td>
            <td class="px-2 py-4 text-ink-900">{{ rankOffset + i + 1 }}</td>
            <td class="px-4 py-4">
              <div class="flex items-center gap-2.5">
                <img
                  v-if="item.logo && !brokenLogos.has(item.slug)"
                  :src="item.logo"
                  :alt="item.name"
                  class="h-10 w-10 shrink-0 rounded-full border border-ink-100 object-cover"
                  loading="lazy"
                  @error="brokenLogos = new Set(brokenLogos).add(item.slug)"
                >
                <span v-else :class="['flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white', avatarBg(item.name)]">{{ initials(item.name) }}</span>
                <div class="min-w-0">
                  <div class="font-semibold text-ink-900">{{ item.name }}</div>
                  <a v-if="item.website" :href="item.website" target="_blank" rel="noopener noreferrer nofollow" class="flex items-center gap-1 text-xs text-ink-900 hover:text-brand-600">
                    {{ item.domain }}
                    <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H18m0 0v4.5M18 6l-7.5 7.5M6 6.75h3M6 12h3m-3 5.25h9a1.5 1.5 0 001.5-1.5V13.5" /></svg>
                  </a>
                </div>
              </div>
            </td>
            <td class="px-4 py-4">
              <div class="flex items-center gap-2">
                <svg class="h-6 w-14 shrink-0" :class="(item.growth ?? 0) >= 0 ? 'text-emerald-500' : 'text-red-500'" viewBox="0 0 50 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path :d="sparkline(item.trend)" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                <span class="font-semibold text-ink-900">{{ formatCompact(item.monthlyVisits) }}</span>
              </div>
            </td>
            <td class="px-4 py-4">
              <span v-if="item.growth === null" class="text-ink-400">—</span>
              <span v-else :class="['flex items-center gap-1 font-semibold', item.growth >= 0 ? 'text-emerald-600' : 'text-red-600']">
                {{ item.growth >= 0 ? '+' : '-' }}{{ formatCompact(item.growth) }}
                <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 20 20" stroke="currentColor" stroke-width="2.5">
                  <path v-if="item.growth >= 0" stroke-linecap="round" stroke-linejoin="round" d="M5 12.5 12.5 5m0 0H7m5.5 0V10" />
                  <path v-else stroke-linecap="round" stroke-linejoin="round" d="M5 5 12.5 12.5m0 0H7m5.5 0V7" />
                </svg>
              </span>
            </td>
            <td class="px-4 py-4">
              <span v-if="item.growthRate === null" class="text-ink-400">—</span>
              <span v-else :class="['flex items-center gap-1 font-semibold', item.growthRate >= 0 ? 'text-emerald-600' : 'text-red-600']">
                {{ item.growthRate >= 0 ? '+' : '' }}{{ item.growthRate.toFixed(2) }}%
                <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 20 20" stroke="currentColor" stroke-width="2.5">
                  <path v-if="item.growthRate >= 0" stroke-linecap="round" stroke-linejoin="round" d="M5 12.5 12.5 5m0 0H7m5.5 0V10" />
                  <path v-else stroke-linecap="round" stroke-linejoin="round" d="M5 5 12.5 12.5m0 0H7m5.5 0V7" />
                </svg>
              </span>
            </td>
            <td class="px-4 py-4">
              <div class="flex max-w-[220px] flex-wrap gap-1">
                <span v-for="(cat, ci) in item.categories.slice(0, 2)" :key="ci" class="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-900">{{ cat }}</span>
                <span v-if="item.categories.length > 2" class="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-900" :title="item.categories.slice(2).join(', ')">+{{ item.categories.length - 2 }}</span>
              </div>
            </td>
            <td class="px-4 py-4">
              <div class="font-semibold text-ink-900">{{ formatDuration(item.avgVisitDuration) }}</div>
              <div v-if="item.bounceRate !== null" class="text-xs text-ink-900">{{ t('websiteInsights.bounceRate') }}: {{ item.bounceRate.toFixed(2) }}%</div>
            </td>
            <td class="px-4 py-4">
              <NuxtLink :to="`/tools/${item.slug}`" class="text-sm font-semibold text-brand-600 hover:text-brand-700">{{ t('websiteInsights.view') }}</NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="error" class="py-16 text-center text-sm text-red-600">{{ t('websiteInsights.loadError') }}</div>
      <div v-else-if="pending && !items.length" class="py-16 text-center text-sm text-ink-400">{{ t('websiteInsights.loading') }}</div>
      <div v-else-if="!items.length" class="py-16 text-center text-sm text-ink-900">{{ t('websiteInsights.noResults') }}</div>
    </div>

    <div v-if="pageCount > 1" class="mt-4 flex items-center justify-end gap-3 text-sm">
      <button type="button" class="rounded-lg border border-ink-200 px-3 py-1.5 font-semibold text-ink-900 hover:border-brand-300 disabled:cursor-not-allowed disabled:opacity-40" :disabled="page <= 1" @click="page--">‹</button>
      <span class="text-ink-600">{{ page }} / {{ pageCount }}</span>
      <button type="button" class="rounded-lg border border-ink-200 px-3 py-1.5 font-semibold text-ink-900 hover:border-brand-300 disabled:cursor-not-allowed disabled:opacity-40" :disabled="page >= pageCount" @click="page++">›</button>
    </div>
  </div>
</template>
