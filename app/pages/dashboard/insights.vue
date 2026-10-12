<script setup lang="ts">
import { FILTER_RANK, type FilterLevel } from '#shared/research'

const { t, locale } = useI18n()
const { authHeaders, isAdmin } = useAuth()
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
  // No Data Credits left for this row: it comes without any figures.
  locked: boolean
}

interface InsightsResponse {
  months: string[]
  month: string | null
  total: number
  page: number
  pageCount: number
  items: InsightItem[]
  // This month's Data Credits after loading the page (null for admins: not charged).
  credits: { used: number; limit: number; charged: number } | null
  categories: { slug: string; name: string }[]
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

// Plan-gated filters (server/utils/insights.ts): advanced = category, visits range,
// growth-rate range; full = + max bounce rate, min visit duration, min pages per visit.
// Locked ones open the Upgrade modal instead; the server refuses them anyway.
const { data: myPlan } = useResearchPlan()
const filterLevel = computed<FilterLevel>(() => myPlan.value?.filters ?? 'basic')
const can = (level: FilterLevel) => FILTER_RANK[filterLevel.value] >= FILTER_RANK[level]
const filters = reactive({
  category: '', minVisits: '', maxVisits: '', minGrowthRate: '', maxGrowthRate: '',
  maxBounceRate: '', minDuration: '', minPagesPerVisit: ''
})
// Typing in a number field: wait for a pause, like the search box.
const appliedFilters = ref({ ...filters })
let filterTimer: ReturnType<typeof setTimeout> | null = null
watch(filters, () => {
  if (filterTimer) clearTimeout(filterTimer)
  filterTimer = setTimeout(() => { appliedFilters.value = { ...filters } }, 400)
}, { deep: true })
onBeforeUnmount(() => { if (filterTimer) clearTimeout(filterTimer) })
const showFilters = ref(false)
const activeFilterCount = computed(() => Object.values(appliedFilters.value).filter(Boolean).length)
function clearFilters() { Object.keys(filters).forEach(k => { (filters as Record<string, string>)[k] = '' }) }
const filterQuery = computed(() => Object.fromEntries(Object.entries(appliedFilters.value).filter(([, v]) => v !== '')))

// Any filter change starts again from the first page.
watch([month, sortOption, debouncedSearch, locale, appliedFilters], () => { page.value = 1 })

const { data, pending, error } = await useFetch<InsightsResponse>('/api/insights', {
  headers: () => authHeaders(),
  query: computed(() => {
    const [sort, dir] = sortOption.value.split('-') as [string, string]
    return {
      month: month.value || undefined,
      q: debouncedSearch.value || undefined,
      sort,
      dir,
      page: page.value,
      limit: PAGE_SIZE,
      locale: locale.value,
      ...filterQuery.value
    }
  })
})

// Same month + filters for the statistics panel. The month goes through its own computed:
// a primitive that only changes with the month, so paging the list (a new `data`) doesn't
// rebuild the query and refetch the statistics.
const shownMonth = computed(() => data.value?.month ?? undefined)
const statsQuery = computed(() => ({ month: shownMonth.value, q: debouncedSearch.value || undefined, locale: locale.value, ...filterQuery.value }))

const items = computed(() => data.value?.items ?? [])
// Rows that can be selected / exported: the ones the user has paid credits for.
const openItems = computed(() => items.value.filter(i => !i.locked))
const lockedCount = computed(() => items.value.length - openItems.value.length)
const credits = computed(() => data.value?.credits ?? null)
const nfCredits = computed(() => new Intl.NumberFormat(locale.value))
const upgradeModalOpen = useState('upgrade-modal-open', () => false)
// Credits were spent: the sidebar's quota bar shows the new figure. Watching each response
// (not the `charged` number, which stays 10 → 10 from one page to the next).
watch(data, (d) => { if (d?.credits?.charged) refreshNuxtData('my-plan') })
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
const allOnPageSelected = computed(() => openItems.value.length > 0 && openItems.value.every(i => selected.value.has(i.slug)))

function toggleRow(item: InsightItem) {
  const next = new Map(selected.value)
  if (next.has(item.slug)) next.delete(item.slug)
  else next.set(item.slug, item)
  selected.value = next
}

function togglePage() {
  const next = new Map(selected.value)
  if (allOnPageSelected.value) openItems.value.forEach(i => next.delete(i.slug))
  else openItems.value.forEach(i => next.set(i.slug, i))
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

// Exports the selected rows, or the current page when nothing is selected. Built on the
// server (POST /api/insights/export), which checks the rows are unlocked and spends the
// plan's export quota (rows per export, rows per month).
const exporting = ref(false)
const exportError = ref('')
async function exportCsv() {
  const rows = selected.value.size ? [...selected.value.values()] : openItems.value
  if (!rows.length || !data.value?.month || exporting.value) return
  exporting.value = true
  exportError.value = ''
  try {
    const blob = await $fetch<Blob>('/api/insights/export', {
      method: 'POST',
      headers: authHeaders(),
      body: { month: data.value.month, slugs: rows.map(r => r.slug), locale: locale.value },
      responseType: 'blob'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `website-insights-${data.value.month}.csv`
    a.click()
    // Revoking in the same tick can cancel the download in Firefox / Safari.
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    refreshNuxtData('my-plan')
  } catch (e: any) {
    // The error body of a blob request arrives as a Blob too.
    let message = e?.data?.message
    if (!message && e?.data instanceof Blob) { try { message = JSON.parse(await e.data.text()).message } catch {} }
    exportError.value = message || t('websiteInsights.exportError')
  } finally {
    exporting.value = false
  }
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
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="flex items-center gap-2 text-xl font-extrabold text-ink-900">
        <span>📈</span> {{ t('websiteInsights.title') }}
      </h1>
      <p v-if="credits" class="text-sm text-ink-600">
        {{ t('websiteInsights.creditsThisMonth') }}: <strong class="text-ink-900">{{ nfCredits.format(credits.used) }}/{{ nfCredits.format(credits.limit) }}</strong>
      </p>
    </div>

    <div v-if="lockedCount && !isAdmin" class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-ink-900">
      <span>{{ t('websiteInsights.outOfCredits', { n: lockedCount }) }}</span>
      <button type="button" class="rounded-lg bg-brand-500 px-4 py-2 font-semibold text-white hover:bg-brand-600" @click="upgradeModalOpen = true">
        {{ t('admin.upgrade') }}
      </button>
    </div>

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

    <div class="mt-3">
      <button type="button" class="text-sm font-semibold text-ink-700 hover:text-brand-600" @click="showFilters = !showFilters">
        ⚙ {{ t('websiteInsights.advancedFilters') }}<template v-if="activeFilterCount"> ({{ activeFilterCount }})</template> {{ showFilters ? '▴' : '▾' }}
      </button>
      <div v-if="showFilters" class="mt-3 grid grid-cols-1 gap-3 rounded-xl border border-ink-100 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <template v-for="f in [
          { key: 'category', level: 'advanced' as FilterLevel, kind: 'select' },
          { key: 'minVisits', level: 'advanced' as FilterLevel, kind: 'number' },
          { key: 'maxVisits', level: 'advanced' as FilterLevel, kind: 'number' },
          { key: 'minGrowthRate', level: 'advanced' as FilterLevel, kind: 'number' },
          { key: 'maxGrowthRate', level: 'advanced' as FilterLevel, kind: 'number' },
          { key: 'maxBounceRate', level: 'full' as FilterLevel, kind: 'number' },
          { key: 'minDuration', level: 'full' as FilterLevel, kind: 'number' },
          { key: 'minPagesPerVisit', level: 'full' as FilterLevel, kind: 'number' }
        ]" :key="f.key">
          <label class="block">
            <span class="mb-1 flex items-center gap-1 text-xs font-semibold text-ink-600">
              <span v-if="!can(f.level)">🔒</span>{{ t(`websiteInsights.filter.${f.key}`) }}
            </span>
            <div v-if="!can(f.level)" class="cursor-pointer rounded-lg border border-dashed border-ink-200 px-3 py-2 text-ink-400 hover:border-brand-300 hover:text-brand-600" @click="upgradeModalOpen = true">
              {{ t(f.level === 'full' ? 'websiteInsights.filterNeedsFull' : 'websiteInsights.filterNeedsAdvanced') }}
            </div>
            <select v-else-if="f.kind === 'select'" v-model="(filters as Record<string, string>)[f.key]" class="w-full rounded-lg border border-ink-200 px-3 py-2 outline-none focus:border-brand-400">
              <option value="">{{ t('websiteInsights.filter.anyCategory') }}</option>
              <option v-for="c in data?.categories ?? []" :key="c.slug" :value="c.slug">{{ c.name }}</option>
            </select>
            <input v-else v-model="(filters as Record<string, string>)[f.key]" type="number" class="w-full rounded-lg border border-ink-200 px-3 py-2 outline-none focus:border-brand-400">
          </label>
        </template>
        <div class="flex items-end sm:col-span-2 lg:col-span-4">
          <button type="button" class="text-sm font-semibold text-ink-500 hover:text-brand-600" :disabled="!activeFilterCount" @click="clearFilters">{{ t('websiteInsights.clearFilters') }}</button>
        </div>
      </div>
    </div>

    <InsightsStats :query="statsQuery" :level="myPlan?.stats ?? 'none'" @upgrade="upgradeModalOpen = true" />

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
          :disabled="(!openItems.length && !selected.size) || exporting"
          @click="exportCsv"
        >
          {{ exporting ? t('admin.upgradeModal.working') : t('websiteInsights.export') }}
        </button>
      </div>
    </div>
    <p v-if="myPlan" class="mt-2 text-right text-xs text-ink-500">
      {{ t('websiteInsights.exportQuota', { used: nfCredits.format(myPlan.usage.exportRows.used), limit: nfCredits.format(myPlan.usage.exportRows.limit), per: nfCredits.format(myPlan.usage.exportRows.perRequest) }) }}
    </p>
    <p v-if="exportError" class="mt-2 text-right text-sm text-red-600">{{ exportError }}</p>

    <div class="mt-5 overflow-x-auto rounded-xl border border-ink-100">
      <table class="w-full min-w-[1100px] text-left text-sm">
        <thead class="border-b border-ink-100 text-xs font-bold uppercase tracking-wide text-ink-900">
          <tr>
            <th class="w-10 px-4 py-3">
              <input type="checkbox" class="h-4 w-4 rounded border-ink-300" :checked="allOnPageSelected" :disabled="!openItems.length" @change="togglePage">
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
            <template v-if="item.locked">
              <td class="px-4 py-4"></td>
              <td class="px-2 py-4 text-ink-400">{{ rankOffset + i + 1 }}</td>
              <td colspan="7" class="px-4 py-4">
                <div class="flex items-center justify-between gap-4">
                  <div class="flex select-none items-center gap-2.5 blur-[3px]" aria-hidden="true">
                    <span class="h-10 w-10 shrink-0 rounded-full bg-ink-200"></span>
                    <span class="h-3 w-40 rounded bg-ink-200"></span>
                    <span class="ml-16 h-3 w-24 rounded bg-ink-200"></span>
                    <span class="ml-16 h-3 w-20 rounded bg-ink-200"></span>
                  </div>
                  <button v-if="!isAdmin" type="button" class="shrink-0 text-sm font-semibold text-brand-600 hover:text-brand-700" @click="upgradeModalOpen = true">
                    🔒 {{ t('websiteInsights.unlock') }}
                  </button>
                </div>
              </td>
            </template>
            <template v-else>
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
            </template>
          </tr>
        </tbody>
      </table>

      <div v-if="error" class="py-16 text-center text-sm text-red-600">{{ error.data?.message || t('websiteInsights.loadError') }}</div>
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
