<script setup lang="ts">
import type { Tool, ToolsResponse } from '~/types'

const { t, locale } = useI18n()
const route = useRoute()

// /archive/2026-09-29 — tools whose addedOn falls on that (UTC) day.
const date = computed(() => String(route.params.date))
if (!/^\d{4}-\d{2}-\d{2}$/.test(date.value) || Number.isNaN(new Date(`${date.value}T00:00:00Z`).getTime())) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found' })
}

// Breadcrumb shows the day as MM-DD-YYYY.
const dateLabel = computed(() => `${date.value.slice(5, 7)}-${date.value.slice(8, 10)}-${date.value.slice(0, 4)}`)

const MAX_TOOLS = 1000
const page = ref(1)
const tools = ref<Tool[]>([])
const pageCount = ref(1)
const loadingMore = ref(false)

watch([locale, date], () => { page.value = 1 })

const { data: toolsRes, error: toolsError, refresh: refreshTools } = await useFetch<ToolsResponse>('/api/tools', {
  query: computed(() => ({
    addedDate: date.value,
    page: page.value,
    limit: 100,
    locale: locale.value
  }))
})

watch(toolsRes, (res) => {
  if (!res) return
  tools.value = (page.value === 1 ? res.items : [...tools.value, ...res.items]).slice(0, MAX_TOOLS)
  pageCount.value = res.pageCount
  loadingMore.value = false
}, { immediate: true })

// A failed page leaves data empty, so the watcher above never clears
// loadingMore and scrolling would stop for good. Clear it here instead; the
// next time the sentinel comes into view loadMore() retries that same page.
watch(toolsError, (err) => { if (err) loadingMore.value = false })

function loadMore() {
  if (loadingMore.value) return
  if (toolsError.value) {
    loadingMore.value = true
    refreshTools()
    return
  }
  if (page.value >= pageCount.value || tools.value.length >= MAX_TOOLS) return
  loadingMore.value = true
  page.value += 1
}

const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

onMounted(() => {
  if (!import.meta.client) return
  observer = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting) loadMore()
  })
  if (sentinel.value) observer.observe(sentinel.value)
})

onBeforeUnmount(() => observer?.disconnect())

// Calendar: starts on the selected day's month; arrows browse other months.
// Only days that have tools are links.
const calendarMonth = ref(date.value.slice(0, 7))
watch(date, (d) => { calendarMonth.value = d.slice(0, 7) })

const { data: activeDays } = await useFetch<{ date: string; count: number }[]>('/api/archive-days', {
  query: computed(() => ({ month: calendarMonth.value }))
})
const daysWithTools = computed(() => new Set((activeDays.value ?? []).map(d => d.date)))

const dateLocale = computed(() => (locale.value === 'vi' ? 'vi-VN' : locale.value))
const monthStart = computed(() => new Date(`${calendarMonth.value}-01T00:00:00Z`))
const monthLabel = computed(() =>
  monthStart.value.toLocaleDateString(dateLocale.value, { month: 'long', year: 'numeric', timeZone: 'UTC' })
)
// 2023-01-01 is a Sunday, so these come out Su → Sa.
const weekdays = computed(() =>
  Array.from({ length: 7 }, (_, i) =>
    new Date(Date.UTC(2023, 0, 1 + i)).toLocaleDateString(dateLocale.value, { weekday: 'short', timeZone: 'UTC' }).slice(0, 2)
  )
)
// Any past or current day can be picked; days that have tools are just shown darker.
const todayIso = new Date().toISOString().slice(0, 10)
const calendarCells = computed(() => {
  const start = monthStart.value
  const daysInMonth = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate()
  const blanks: null[] = Array.from({ length: start.getUTCDay() }, () => null)
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const iso = `${calendarMonth.value}-${String(i + 1).padStart(2, '0')}`
    return { day: i + 1, iso, hasTools: daysWithTools.value.has(iso), selected: iso === date.value, future: iso > todayIso }
  })
  return [...blanks, ...days]
})

function shiftMonth(delta: number) {
  const start = monthStart.value
  calendarMonth.value = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + delta, 1)).toISOString().slice(0, 7)
}

useSeoMeta({
  title: () => `${t('archive.title')} ${dateLabel.value} — TopAICollection`
})
</script>

<template>
  <div class="bg-white">
    <div class="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
      <nav class="flex flex-wrap items-center gap-3 text-sm text-ink-900">
        <NuxtLink to="/" class="hover:text-brand-600">{{ t('category.breadcrumbHome') }}</NuxtLink>
        <span>/</span>
        <span>{{ t('archive.title') }}</span>
        <span>/</span>
        <span class="text-brand-600">{{ dateLabel }}</span>
      </nav>

      <div class="mt-6 grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_325px]">
        <div class="overflow-hidden rounded-lg border border-ink-200 shadow-sm">
          <table class="w-full text-base">
            <thead class="bg-brand-500 text-left text-white">
              <tr>
                <th class="w-[120px] px-4 py-2.5 text-center font-medium">{{ t('archive.rank') }}</th>
                <th class="px-4 py-2.5 font-medium md:w-[30%]">{{ t('archive.name') }}</th>
                <th class="hidden px-4 py-2.5 font-medium md:table-cell">{{ t('archive.introduction') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-ink-100">
              <tr v-for="(tool, i) in tools" :key="tool.slug" class="hover:bg-ink-100/40">
                <td class="px-4 py-2.5 text-center text-ink-600">{{ i + 1 }}</td>
                <td class="px-4 py-2.5">
                  <NuxtLink :to="`/tools/${tool.slug}`" class="text-ink-600 hover:text-brand-600">{{ tool.name }}</NuxtLink>
                </td>
                <td class="hidden px-4 py-2.5 text-ink-500 md:table-cell">
                  <span class="line-clamp-2">{{ tool.shortDesc }}</span>
                </td>
              </tr>
              <tr v-if="!tools.length">
                <td colspan="3" class="px-4 py-12 text-center text-sm text-ink-400">{{ t('empty.noResults') }}.</td>
              </tr>
            </tbody>
          </table>
          <div ref="sentinel" class="h-px"></div>
          <p v-if="loadingMore" class="py-4 text-center text-sm text-ink-400">{{ t('tool.loadingMore') }}</p>
        </div>

        <div class="overflow-hidden rounded-lg border border-ink-200">
          <div class="flex items-center justify-between bg-brand-500 px-2 py-2 text-white">
            <button type="button" class="rounded p-1.5 hover:bg-white/15" aria-label="Previous month" @click="shiftMonth(-1)">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 20 20" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="m12.5 5-5 5 5 5" /></svg>
            </button>
            <span class="text-base font-medium">{{ monthLabel }}</span>
            <button type="button" class="rounded p-1.5 hover:bg-white/15" aria-label="Next month" @click="shiftMonth(1)">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 20 20" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="m7.5 5 5 5-5 5" /></svg>
            </button>
          </div>
          <div class="grid grid-cols-7 px-2 pb-2 text-center text-sm">
            <span v-for="w in weekdays" :key="w" class="py-2.5 text-ink-500">{{ w }}</span>
            <template v-for="(cell, i) in calendarCells" :key="cell ? cell.iso : `blank-${i}`">
              <span v-if="!cell" />
              <NuxtLink
                v-else-if="!cell.future || cell.selected"
                :to="`/archive/${cell.iso}`"
                :class="['mx-auto flex h-10 w-7 items-center justify-center', cell.selected ? '' : cell.hasTools ? 'font-semibold text-ink-900 hover:text-brand-600' : 'text-ink-600 hover:text-brand-600']"
              >
                <span :class="cell.selected ? 'flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-white' : ''">{{ cell.day }}</span>
              </NuxtLink>
              <span v-else class="flex h-10 items-center justify-center text-ink-300">{{ cell.day }}</span>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
