<script setup lang="ts">
import type { GptsResponse, ToolsResponse } from '~/types'
import { PUBLIC_LIMITS } from '#shared/research'

// /search?q=…&page=…: tools whose name matches, plus matching categories and GPTs.
// Not cached and noindex (nuxt.config.ts); the hero search box lands here.
const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const localePath = useLocalePath()

const PER_PAGE = 24
const q = computed(() => (typeof route.query.q === 'string' ? route.query.q.trim().slice(0, 80) : ''))
const page = computed(() => Math.max(1, Math.floor(Number(route.query.page)) || 1))
const input = ref(q.value)
watch(q, (v) => { input.value = v })

function search(value: string) {
  const query = value.trim()
  router.push(localePath(query ? { path: '/search', query: { q: query } } : '/search'))
}

// Deeper pages carry the login token: guests stop at PUBLIC_LIMITS.guestListTools tools.
const { authHeaders, token } = useAuth()
const [{ data: toolsRes, error: toolsError }, { data: gptsRes }, { data: categories }] = await Promise.all([
  useAsyncData(
    () => `search-tools:${locale.value}:${page.value}:${q.value}`,
    () => (q.value
      ? $fetch<ToolsResponse>('/api/tools', {
          headers: page.value > 1 ? authHeaders() : {},
          query: { q: q.value, page: page.value, limit: PER_PAGE, locale: locale.value }
        })
      : Promise.resolve(null))
  ),
  useAsyncData(
    () => `search-gpts:${q.value}`,
    () => (q.value ? $fetch<GptsResponse>('/api/gpts', { query: { q: q.value, limit: 8 } }) : Promise.resolve(null))
  ),
  useCategories()
])
if (toolsError.value) throw createError({ statusCode: 503, statusMessage: 'Service unavailable' })

const tools = computed(() => toolsRes.value?.items ?? [])
const total = computed(() => toolsRes.value?.total ?? 0)
const gpts = computed(() => (page.value === 1 ? gptsRes.value?.items ?? [] : []))
const matchingCategories = computed(() => {
  const needle = q.value.toLowerCase()
  if (!needle || page.value > 1) return []
  return (categories.value ?? []).filter(c => c.name.toLowerCase().includes(needle)).slice(0, 12)
})

// Guests can't page past PUBLIC_LIMITS.guestListTools tools (the server returns nothing
// there), so they don't get those page numbers either. Decided after mount: the login
// token only exists in the browser, and the server-rendered page is a guest's.
const mounted = ref(false)
onMounted(() => { mounted.value = true })

// Reported for the home page's Popular searches (server/utils/searchTerms.ts) — from the
// browser only, so crawlers and the page cache don't count, and once per search, not per
// page of results. Fire and forget.
function reportSearch(term: string) {
  if (!term || page.value > 1) return
  $fetch('/api/search/log', { method: 'POST', body: { q: term, locale: locale.value } }).catch(() => {})
}
onMounted(() => reportSearch(q.value))
watch(q, term => reportSearch(term))
const pageCount = computed(() => {
  const all = toolsRes.value?.pageCount ?? 1
  return mounted.value && token.value ? all : Math.min(all, Math.ceil(PUBLIC_LIMITS.guestListTools / PER_PAGE))
})
const currentPage = computed({
  get: () => page.value,
  set: (next: number) => {
    router.push({ query: { q: q.value, ...(next > 1 ? { page: String(next) } : {}) } })
    if (import.meta.client) window.scrollTo({ top: 0 })
  }
})

const seoTitle = computed(() => (q.value ? `${q.value} — Search — TopAICollection` : 'Search AI Tools — TopAICollection'))
useSeoMeta({
  title: seoTitle,
  description: 'Search the TopAICollection directory of AI tools, categories and GPTs.',
  robots: 'noindex, follow'
})
</script>

<template>
  <div class="after-dot-grid [--after-dot-grid-bg:#FAFAFB]">
  <div class="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
    <nav class="flex items-center gap-1.5 text-xs text-ink-400">
      <NuxtLinkLocale to="/" class="hover:text-brand-600">{{ t('category.breadcrumbHome') }}</NuxtLinkLocale>
      <span>›</span>
      <span class="text-ink-600">{{ t('searchPage.title') }}</span>
    </nav>

    <h1 class="mt-3 text-3xl font-extrabold text-ink-900">
      {{ q ? t('searchPage.resultsFor', { q }) : t('searchPage.title') }}
    </h1>
    <p v-if="q" class="mt-1 text-sm text-ink-500">{{ t('searchPage.toolCount', { n: total }, total) }}</p>

    <div class="mt-6">
      <SearchBar v-model="input" :placeholder="t('hero.searchPlaceholder')" @submit="search" />
    </div>

    <p v-if="!q" class="mt-10 text-center text-sm text-ink-500">{{ t('searchPage.prompt') }}</p>

    <template v-else>
      <section v-if="matchingCategories.length" class="mt-10">
        <h2 class="text-lg font-extrabold text-ink-900">{{ t('searchPage.categories') }}</h2>
        <div class="mt-3 flex flex-wrap gap-2">
          <NuxtLinkLocale
            v-for="cat in matchingCategories"
            :key="cat.slug"
            :to="`/category/${cat.slug}`"
            class="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-sm text-ink-700 transition hover:border-brand-300 hover:text-brand-600"
          >
            <CategoryIcon :icon="cat.icon" />
            {{ cat.name }}
            <span class="text-xs text-ink-400">{{ cat.count }}</span>
          </NuxtLinkLocale>
        </div>
      </section>

      <section class="mt-10">
        <h2 class="text-lg font-extrabold text-ink-900">{{ t('searchPage.tools') }}</h2>
        <div v-if="tools.length" class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ToolCard v-for="tool in tools" :key="tool.id" :tool="tool" featured />
        </div>
        <div v-else class="mt-4 rounded-xl border border-dashed border-ink-200 py-16 text-center text-sm text-ink-400">
          {{ t('searchPage.noResults', { q }) }}
        </div>
        <div v-if="pageCount > 1" class="mt-8 flex justify-center">
          <Pagination v-model:page="currentPage" :page-count="pageCount" />
        </div>
      </section>

      <section v-if="gpts.length" class="mt-12">
        <div class="flex items-center justify-between gap-3">
          <h2 class="text-lg font-extrabold text-ink-900">{{ t('searchPage.gpts') }}</h2>
          <NuxtLinkLocale :to="{ path: '/gpts', query: { q } }" class="text-sm font-semibold text-brand-600 hover:text-brand-700">
            {{ t('searchPage.seeAllGpts') }} →
          </NuxtLinkLocale>
        </div>
        <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <GptCard v-for="gpt in gpts" :key="gpt.slug" :gpt="gpt" />
        </div>
      </section>
    </template>
  </div>
  </div>
</template>
