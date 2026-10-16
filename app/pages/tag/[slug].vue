<script setup lang="ts">
import type { Tool, ToolsResponse } from '~/types'
import { TAG_INDEX_MIN_TOOLS } from '#shared/site'

// Tools carrying one tag (the #tags on a tool page link here).
const { t, locale } = useI18n()
const route = useRoute()
const slug = computed(() => String(route.params.slug))

const viewMode = ref<'grid' | 'list'>('grid')
const page = ref(1)
const tools = ref<Tool[]>([])
const pageCount = ref(1)
const loadingMore = ref(false)

// Deeper pages carry the login token: guests stop at PUBLIC_LIMITS.guestListTools tools.
const { authHeaders } = useAuth()
const [{ data: tag, error: tagError }, { data: toolsRes, error: toolsError, refresh: refreshTools }] = await Promise.all([
  useFetch<{ slug: string; name: string; count: number }>(() => `/api/tags/${encodeURIComponent(slug.value)}`, {
    query: computed(() => ({ locale: locale.value }))
  }),
  useFetch<ToolsResponse>('/api/tools', {
    headers: computed(() => (page.value > 1 ? authHeaders() : {})),
    query: computed(() => ({
      tag: slug.value,
      sort: 'featured',
      page: page.value,
      limit: 24,
      locale: locale.value
    }))
  })
])

if (tagError.value) {
  const notFound = tagError.value.statusCode === 404
  throw createError({ statusCode: notFound ? 404 : 503, statusMessage: notFound ? 'Tag not found' : 'Service unavailable' })
}

watch(toolsRes, (res) => {
  if (!res) return
  tools.value = page.value === 1 ? res.items : [...tools.value, ...res.items]
  pageCount.value = res.loginRequired ? page.value : res.pageCount
  loadingMore.value = false
}, { immediate: true })

// A failed page leaves data empty, so the watcher above never clears
// loadingMore and scrolling would stop for good. Clear it here instead; the
// next time the sentinel comes into view loadMore() retries that same page.
watch(toolsError, (err) => { if (err) loadingMore.value = false })

watch([locale, slug], () => { page.value = 1 })

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

const tagName = computed(() => tag.value?.name ?? slug.value)
const seoTitle = computed(() => `#${tagName.value} AI Tools — TopAICollection`)
const seoDescription = computed(() => `${tag.value?.count ?? ''} AI tools tagged ${tagName.value}: compare features, pricing, ratings and reviews on TopAICollection.`.trim())
useSeoMeta({
  title: seoTitle,
  description: seoDescription,
  ogTitle: seoTitle,
  ogDescription: seoDescription,
  // Matches the sitemap, which leaves these out (server/api/__sitemap__/urls.ts).
  robots: () => ((tag.value?.count ?? 0) < TAG_INDEX_MIN_TOOLS ? 'noindex, follow' : undefined)
})
useBreadcrumbLd(() => [[`#${tagName.value}`, `/tag/${slug.value}`]])
</script>

<template>
  <div class="after-dot-grid [--after-dot-grid-bg:#FAFAFB]">
  <div class="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
    <nav class="flex items-center gap-1.5 text-xs text-ink-400">
      <NuxtLinkLocale to="/" class="hover:text-brand-600">{{ t('category.breadcrumbHome') }}</NuxtLinkLocale>
      <span>›</span>
      <span class="text-ink-600">#{{ tagName }}</span>
    </nav>

    <div class="mt-3 flex flex-wrap items-center justify-between gap-3 pb-2">
      <div>
        <h1 class="text-3xl font-extrabold text-ink-900">#{{ tagName }}</h1>
        <p class="mt-1 text-sm text-ink-500">{{ t('tagPage.count', { n: tag?.count ?? 0 }) }}</p>
      </div>

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
        <div v-if="viewMode === 'grid'" class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ToolCard v-for="tool in tools" :key="tool.id" :tool="tool" featured />
        </div>
        <div v-else class="divide-y divide-ink-100">
          <ToolListRow v-for="tool in tools" :key="tool.id" :tool="tool" :category-label="tool.categories?.[0]?.name" />
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
</template>
