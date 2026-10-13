<script setup lang="ts">
import type { Tool, ToolsResponse } from '~/types'

// "Discord of AI": tools with a Discord community, each with a link to join it.
const { t, locale } = useI18n()

const viewMode = ref<'grid' | 'list'>('grid')
const page = ref(1)
const tools = ref<Tool[]>([])
const pageCount = ref(1)
const loadingMore = ref(false)

// Deeper pages carry the login token: guests stop at PUBLIC_LIMITS.guestListTools tools.
const { authHeaders } = useAuth()
const { data: toolsRes, error: toolsError, refresh: refreshTools } = await useFetch<ToolsResponse>('/api/tools', {
  headers: computed(() => (page.value > 1 ? authHeaders() : {})),
  query: computed(() => ({
    hasDiscord: 'true',
    sort: 'featured',
    page: page.value,
    limit: 24,
    locale: locale.value
  }))
})

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

const SEO_DESCRIPTION = 'Discord communities of AI tools: join the servers where AI products share updates, support and tips with their users.'
useSeoMeta({
  title: 'Discord of AI — TopAICollection',
  description: SEO_DESCRIPTION,
  ogTitle: 'Discord of AI — TopAICollection',
  ogDescription: SEO_DESCRIPTION
})
useBreadcrumbLd(() => [['Discord of AI', '/discord']])
</script>

<template>
  <div>
  <AppHero />
  <div class="after-dot-grid [--after-dot-grid-bg:#FDFAFB]">
  <div class="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
    <nav class="flex items-center gap-1.5 text-xs text-ink-400">
      <NuxtLinkLocale to="/" class="hover:text-brand-600">{{ t('category.breadcrumbHome') }}</NuxtLinkLocale>
      <span>›</span>
      <span class="text-ink-600">{{ t('productsMenu.discordTitle') }}</span>
    </nav>

    <div class="mt-3 flex flex-wrap items-center justify-between gap-3 pb-2">
      <div>
        <h1 class="text-3xl font-extrabold text-ink-900">{{ t('productsMenu.discordTitle') }}</h1>
        <p class="mt-1 text-sm text-ink-500">{{ t('productsMenu.discordDesc') }}</p>
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
        <!-- The cards are links themselves, so the Discord link sits under each one. -->
        <div v-if="viewMode === 'grid'" class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div v-for="tool in tools" :key="tool.id" class="flex flex-col gap-2">
            <ToolCard :tool="tool" featured class="flex-1" />
            <a
              v-if="tool.discordUrl"
              :href="tool.discordUrl"
              target="_blank"
              rel="nofollow noopener"
              class="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#5865F2]/30 bg-[#5865F2]/5 px-3 py-2 text-sm font-semibold text-[#4752C4] transition hover:bg-[#5865F2] hover:text-white"
            >
              {{ t('discordPage.join') }} ↗
            </a>
          </div>
        </div>
        <div v-else class="divide-y divide-ink-100">
          <div v-for="tool in tools" :key="tool.id" class="flex items-center gap-4">
            <ToolListRow :tool="tool" :category-label="tool.categories?.[0]?.name" class="min-w-0 flex-1" />
            <a
              v-if="tool.discordUrl"
              :href="tool.discordUrl"
              target="_blank"
              rel="nofollow noopener"
              class="shrink-0 rounded-full border border-[#5865F2]/30 bg-[#5865F2]/5 px-3 py-1.5 text-xs font-semibold text-[#4752C4] transition hover:bg-[#5865F2] hover:text-white"
            >
              {{ t('discordPage.join') }} ↗
            </a>
          </div>
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
