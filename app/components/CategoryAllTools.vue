<script setup lang="ts">
import type { ToolsResponse } from '~/types'
import type { CategoryGroup, CategoryNode } from '~/components/CategoryNav.vue'
import { advertise } from '~/data/promote'
import { PUBLIC_LIMITS } from '#shared/research'

const { t, locale } = useI18n()
const route = useRoute()
const slug = computed(() => String(route.params.slug))
const isAll = computed(() => slug.value === 'all')

const pricingValues = ['FREE', 'FREEMIUM', 'PAID'] as const
const sortValues = ['newest', 'featured', 'name'] as const

const initialPricing = pricingValues.find(p => p === route.query.pricing) ?? 'all'
const initialSort = sortValues.find(s => s === route.query.sort) ?? 'newest'

const pricingFilter = ref<'all' | 'FREE' | 'FREEMIUM' | 'PAID'>(initialPricing)
const sortBy = ref<'newest' | 'featured' | 'name'>(initialSort)
const searchQuery = ref(String(route.query.q ?? ''))
const page = ref(1)
const viewMode = ref<'grid' | 'list'>('grid')
// Phones: the category browser opens as a sheet.
const browserOpen = ref(false)
watch(slug, () => { browserOpen.value = false })
watch(browserOpen, (open) => { if (import.meta.client) document.documentElement.style.overflow = open ? 'hidden' : '' })
const closeOnEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') browserOpen.value = false }
onMounted(() => document.addEventListener('keydown', closeOnEscape))
onBeforeUnmount(() => {
  document.removeEventListener('keydown', closeOnEscape)
  document.documentElement.style.overflow = ''
})

watch([pricingFilter, sortBy, searchQuery, slug], () => { page.value = 1 })

const { authHeaders, token } = useAuth()
// Two levels from the categories' own parents (server/api/categories/tree.get.ts).
const [{ data: tree }, { data: toolsRes }] = await Promise.all([
  useFetch<{ groups: CategoryGroup[]; ungrouped: CategoryNode[]; ungroupedCount: number }>('/api/categories/tree', {
    key: computed(() => `category-tree:${locale.value}`),
    query: computed(() => ({ locale: locale.value }))
  }),
  useFetch<ToolsResponse>('/api/tools', {
    // Deeper pages carry the login token: guests stop at PUBLIC_LIMITS.guestListTools tools.
    headers: computed(() => (page.value > 1 ? authHeaders() : {})),
    query: computed(() => ({
      category: isAll.value ? undefined : slug.value,
      pricing: pricingFilter.value === 'all' ? undefined : pricingFilter.value,
      q: searchQuery.value || undefined,
      sort: sortBy.value,
      page: page.value,
      limit: 24,
      locale: locale.value
    }))
  })
])
const groups = computed(() => tree.value?.groups ?? [])
const ungrouped = computed(() => tree.value?.ungrouped ?? [])
// The open category's group: itself when it is one, else the group it sits in.
const activeGroup = computed(() => (isAll.value ? undefined : groups.value.find(g => g.slug === slug.value || g.children.some(c => c.slug === slug.value))))
const activeCategory = computed<CategoryNode | undefined>(() => {
  if (isAll.value) return undefined
  if (activeGroup.value?.slug === slug.value) return activeGroup.value
  return activeGroup.value?.children.find(c => c.slug === slug.value) ?? ungrouped.value.find(c => c.slug === slug.value)
})
const title = computed(() => activeCategory.value?.name ?? (isAll.value ? t('category.allToolsTitle') : slug.value))

// Sponsored slots of this category (any category on /category/all), on page 1.
// One banner under row 3 of the grid, whatever its column count: pinned with
// grid-row-start, the cards flow around it (a shorter list leaves it at the end).
// List view: after tool 3. Fewer than 3 tools: no banner.
const bannerRow = advertise.bannerAfterRow + 1
const { feed } = useAdSlots('category', { category: () => slug.value, positions: [bannerRow], rerender: () => [viewMode.value, items.value] })
const bannerStyle = { gridRowStart: bannerRow }
const tools = computed(() => toolsRes.value?.items ?? [])
// No banner under a price filter (an ad for a paid tool would contradict "Free");
// search results do get one.
const showAds = computed(() => page.value === 1 && pricingFilter.value === 'all')
const items = computed(() => (showAds.value ? feed(tools.value) : tools.value.map(tool => ({ key: tool.slug, tool, ad: undefined }))))
const total = computed(() => toolsRes.value?.total ?? 0)
// Guests can't page past PUBLIC_LIMITS.guestListTools tools (the server returns nothing
// there), so they don't get those page numbers either. Decided after mount: the login
// token only exists in the browser, and the server-rendered page is a guest's.
const mounted = ref(false)
onMounted(() => { mounted.value = true })
const pageCount = computed(() => {
  const all = toolsRes.value?.pageCount ?? 1
  return mounted.value && token.value ? all : Math.min(all, Math.ceil(PUBLIC_LIMITS.guestListTools / 24))
})

const seoTitle = computed(() => isAll.value ? 'All AI Tools — TopAICollection' : `${title.value} AI Tools — TopAICollection`)
const seoDescription = computed(() => isAll.value
  ? 'Browse every AI tool in the TopAICollection directory. Filter by pricing, sort by popularity or rating, and find the right AI for your work.'
  : `The best ${title.value} AI tools: compare features, pricing, ratings and reviews on TopAICollection.`)
useSeoMeta({
  title: seoTitle,
  description: seoDescription,
  ogTitle: seoTitle,
  ogDescription: seoDescription
})
useBreadcrumbLd(() => [
  ['Categories', '/categories'],
  ...(activeGroup.value && activeGroup.value.slug !== slug.value ? [[activeGroup.value.name, `/category/${activeGroup.value.slug}`] as [string, string]] : []),
  [isAll.value ? 'All AI Tools' : title.value, `/category/${slug.value}`]
])
</script>

<template>
  <div class="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
    <nav class="flex flex-wrap items-center gap-1.5 text-xs text-ink-400">
      <NuxtLinkLocale to="/" class="hover:text-brand-600">{{ t('category.breadcrumbHome') }}</NuxtLinkLocale>
      <span aria-hidden="true">›</span>
      <NuxtLinkLocale to="/categories" class="hover:text-brand-600">{{ t('categoriesPage.breadcrumb') }}</NuxtLinkLocale>
      <span aria-hidden="true">›</span>
      <template v-if="activeGroup && activeGroup.slug !== slug">
        <NuxtLinkLocale :to="`/category/${activeGroup.slug}`" class="hover:text-brand-600">{{ activeGroup.name }}</NuxtLinkLocale>
        <span aria-hidden="true">›</span>
      </template>
      <span class="text-ink-600">{{ title }}</span>
    </nav>

    <div class="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="min-w-0">
        <h1 class="flex items-center gap-2.5 text-3xl font-extrabold tracking-[-.02em] text-ink-900">
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-xl text-brand-600" aria-hidden="true">
            <CategoryIcon v-if="activeCategory" :icon="activeCategory.icon" />
            <template v-else>🗂️</template>
          </span>
          <span class="min-w-0 break-words">{{ title }}</span>
        </h1>
        <p class="mt-1.5 text-sm text-ink-500">{{ total }} {{ t('category.toolsFound', total) }}</p>
      </div>
      <div class="w-full sm:max-w-xs">
        <SearchBar v-model="searchQuery" :placeholder="t('category.searchPlaceholder')" dense />
      </div>
    </div>

    <div class="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
      <!-- Desktop: the category browser, sticky, scrolling inside itself. -->
      <aside class="hidden lg:block">
        <div class="sticky top-[88px] flex h-[calc(100vh-112px)] flex-col">
          <CategoryNav :groups="groups" :ungrouped="ungrouped" :ungrouped-count="tree?.ungroupedCount ?? 0" :active="slug" class="h-full" />
        </div>
      </aside>

      <div class="min-w-0">
        <!-- Phones: a button that opens the browser as a sheet. -->
        <button
          type="button"
          class="mb-4 flex w-full items-center justify-between gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3 text-left text-sm lg:hidden"
          @click="browserOpen = true"
        >
          <span class="min-w-0 truncate"><span class="text-ink-500">{{ t('category.browse') }}:</span> <span class="font-semibold text-ink-900">{{ title }}</span></span>
          <svg class="h-4 w-4 shrink-0 text-ink-400" fill="none" viewBox="0 0 20 20" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m5 7.5 5 5 5-5" /></svg>
        </button>

        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 pb-4">
          <div class="flex flex-wrap gap-2">
            <button
              v-for="p in (['all', 'FREE', 'FREEMIUM', 'PAID'] as const)"
              :key="p"
              :class="[
                'rounded-full border px-3 py-1.5 text-sm font-semibold transition',
                pricingFilter === p ? 'border-brand-500 bg-brand-500 text-white' : 'border-ink-200 text-ink-600 hover:border-brand-300'
              ]"
              @click="pricingFilter = p"
            >
              {{ p === 'all' ? t('category.allPricing') : t(`pricing.${p}`) }}
            </button>
          </div>

          <div class="flex items-center gap-2">
            <select
              v-model="sortBy"
              class="rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-sm font-semibold text-ink-600 outline-none focus:border-brand-300"
            >
              <option value="newest">{{ t('category.sortNewest') }}</option>
              <option value="featured">{{ t('category.sortFeatured') }}</option>
              <option value="name">{{ t('category.sortName') }}</option>
            </select>

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
        </div>

        <template v-if="tools.length">
          <div v-if="viewMode === 'grid'" class="mt-4 grid grid-flow-row-dense grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <template v-for="item in items" :key="item.key">
              <AdBanner v-if="item.ad" :ad="item.ad" placement="category" class="col-span-full" :style="bannerStyle" />
              <ToolCard v-else :tool="item.tool" />
            </template>
          </div>
          <div v-else class="mt-2 divide-y divide-ink-100">
            <template v-for="item in items" :key="item.key">
              <div v-if="item.ad" class="py-3"><AdBanner :ad="item.ad" placement="category" /></div>
              <ToolListRow v-else :tool="item.tool" :category-label="item.tool.categories?.[0]?.name" />
            </template>
          </div>
        </template>
        <div v-else class="mt-10 rounded-xl border border-dashed border-ink-200 py-16 text-center text-sm text-ink-400">
          {{ t('empty.noResults') }}{{ searchQuery ? ` "${searchQuery}"` : '' }}.
        </div>

        <Pagination v-model:page="page" :page-count="pageCount" />
      </div>
    </div>

    <Teleport to="body">
      <div v-if="browserOpen" class="fixed inset-0 z-50 flex items-end bg-black/40 lg:hidden" @click.self="browserOpen = false">
        <div class="flex h-[85dvh] w-full flex-col rounded-t-2xl bg-white p-4 shadow-xl" role="dialog" aria-modal="true" :aria-label="t('category.browse')">
          <div class="mb-3 flex items-center justify-between">
            <span class="text-base font-bold text-ink-900">{{ t('category.browse') }}</span>
            <button type="button" class="grid h-9 w-9 place-items-center rounded-lg text-ink-500 hover:bg-ink-100" :aria-label="t('category.close')" @click="browserOpen = false">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <CategoryNav :groups="groups" :ungrouped="ungrouped" :ungrouped-count="tree?.ungroupedCount ?? 0" :active="slug" class="min-h-0 flex-1" @navigate="browserOpen = false" />
        </div>
      </div>
    </Teleport>
  </div>
</template>
