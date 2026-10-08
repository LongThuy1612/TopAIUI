<script setup lang="ts">
import type { Tool, ToolsResponse } from '~/types'
import { advertise } from '~/data/promote'

const { t, locale } = useI18n()

const viewMode = ref<'grid' | 'list'>('grid')
const page = ref(1)
const tools = ref<Tool[]>([])
const pageCount = ref(1)
const loadingMore = ref(false)

// One banner under row 3 of the grid, whatever its column count: pinned with
// grid-row-start, the cards flow around it (a shorter list leaves it at the end).
// List view: after tool 3. Fewer than 3 tools: no banner.
const bannerRow = advertise.bannerAfterRow + 1
const { feed } = useAdSlots('new', { positions: [bannerRow], rerender: () => [viewMode.value, items.value] })
const bannerStyle = { gridRowStart: bannerRow }
const items = computed(() => feed(tools.value))

const { data: toolsRes, error: toolsError, refresh: refreshTools } = await useFetch<ToolsResponse>('/api/tools', {
  query: computed(() => ({
    newToday: 'true',
    page: page.value,
    limit: 24,
    locale: locale.value
  }))
})

watch(toolsRes, (res) => {
  if (!res) return
  tools.value = page.value === 1 ? res.items : [...tools.value, ...res.items]
  pageCount.value = res.pageCount
  loadingMore.value = false
}, { immediate: true })

// A failed page leaves data empty, so the watcher above never clears
// loadingMore and scrolling would stop for good. Clear it here instead; the
// next time the sentinel comes into view loadMore() retries that same page.
watch(toolsError, (err) => { if (err) loadingMore.value = false })

watch(locale, () => { page.value = 1 })

function loadMore() {
  if (loadingMore.value) return
  if (toolsError.value) {
    loadingMore.value = true
    refreshTools()
    return
  }
  if (page.value >= pageCount.value) return
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

useSeoMeta({
  title: 'New — TopAICollection'
})
</script>

<template>
  <div>
  <AppHero />
  <div class="after-dot-grid [--after-dot-grid-bg:#FDFAFB]">
  <div class="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
    <nav class="flex items-center gap-1.5 text-xs text-ink-400">
      <NuxtLink to="/" class="hover:text-brand-600">{{ t('category.breadcrumbHome') }}</NuxtLink>
      <span>›</span>
      <span class="text-ink-600">{{ t('tabs.featured') }}</span>
    </nav>

    <div class="mt-3 flex flex-wrap items-center justify-between gap-3 pb-2">
      <h1 class="flex items-center gap-2 text-3xl font-extrabold text-ink-900">
        <span>🆕</span> {{ t('tabs.featured') }}
      </h1>

      <div class="flex items-center gap-0.5 rounded-lg border border-ink-200 p-0.5">
        <button
          type="button"
          :aria-label="t('category.viewGrid')"
          :class="['rounded-md p-1.5 transition', viewMode === 'grid' ? 'bg-ink-100 text-ink-900' : 'text-ink-400 hover:text-ink-600']"
          @click="viewMode = 'grid'"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 5h7v7H4V5zm9 0h7v7h-7V5zM4 14h7v7H4v-7zm9 0h7v7h-7v-7z" />
          </svg>
        </button>
        <button
          type="button"
          :aria-label="t('category.viewList')"
          :class="['rounded-md p-1.5 transition', viewMode === 'list' ? 'bg-ink-100 text-ink-900' : 'text-ink-400 hover:text-ink-600']"
          @click="viewMode = 'list'"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </div>

    <div class="mt-1 py-4">
      <template v-if="tools.length">
        <div v-if="viewMode === 'grid'" class="grid grid-flow-row-dense grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <template v-for="item in items" :key="item.key">
            <AdBanner v-if="item.ad" :ad="item.ad" placement="new" class="col-span-full" :style="bannerStyle" />
            <ToolCard v-else :tool="item.tool" featured />
          </template>
        </div>
        <div v-else class="divide-y divide-ink-100">
          <template v-for="item in items" :key="item.key">
            <div v-if="item.ad" class="py-3"><AdBanner :ad="item.ad" placement="new" /></div>
            <ToolListRow v-else :tool="item.tool" :category-label="item.tool.categories?.[0]?.name" />
          </template>
        </div>
      </template>
      <div v-else class="rounded-xl border border-dashed border-ink-200 py-16 text-center text-sm text-ink-400">
        {{ t('empty.noResults') }}.
      </div>
    </div>

    <div ref="sentinel" class="h-px"></div>
    <p v-if="loadingMore" class="py-6 text-center text-sm text-ink-400">{{ t('tool.loadingMore') }}</p>
  </div>
  </div>
  </div>
</template>
