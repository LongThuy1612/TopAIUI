<script setup lang="ts">
import type { Category, ToolsResponse } from '~/types'

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
const filtersOpen = ref(false)

watch([pricingFilter, sortBy, searchQuery, slug], () => { page.value = 1 })

const [{ data: categories }, { data: toolsRes }] = await Promise.all([
  useFetch<Category[]>('/api/categories', { query: computed(() => ({ locale: locale.value })) }),
  useFetch<ToolsResponse>('/api/tools', {
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
const activeCategory = computed(() => isAll.value ? undefined : categories.value?.find(c => c.slug === slug.value))

const tools = computed(() => toolsRes.value?.items ?? [])
const total = computed(() => toolsRes.value?.total ?? 0)
const pageCount = computed(() => toolsRes.value?.pageCount ?? 1)

useSeoMeta({
  title: () => isAll.value ? 'All AI Tools — TopAICollection' : `${activeCategory.value?.name ?? slug.value} AI Tools — TopAICollection`
})
</script>

<template>
  <div class="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
    <nav class="flex items-center gap-1.5 text-xs text-ink-400">
      <NuxtLink to="/" class="hover:text-brand-600">{{ t('category.breadcrumbHome') }}</NuxtLink>
      <span>›</span>
      <span class="text-ink-600">{{ activeCategory?.name ?? (isAll ? t('category.allToolsTitle') : slug) }}</span>
    </nav>

    <div class="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="flex items-center gap-2 text-3xl font-extrabold text-ink-900">
          <CategoryIcon v-if="activeCategory" :icon="activeCategory.icon" />
          <span v-else>🗂️</span>
          {{ activeCategory?.name ?? (isAll ? t('category.allToolsTitle') : slug) }}
        </h1>
        <p class="mt-1.5 text-sm text-ink-500">{{ total }} {{ t('category.toolsFound', total) }}</p>
      </div>
      <div class="w-full sm:max-w-xs">
        <SearchBar v-model="searchQuery" :placeholder="t('category.searchPlaceholder')" dense />
      </div>
    </div>

    <div class="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
      <button
        type="button"
        class="flex items-center justify-between rounded-lg border border-ink-200 px-3 py-2.5 text-sm font-semibold text-ink-600 lg:hidden"
        @click="filtersOpen = !filtersOpen"
      >
        {{ t('category.filters') }}
        <svg :class="['h-4 w-4 transition-transform', filtersOpen ? 'rotate-180' : '']" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <aside :class="['space-y-2', filtersOpen ? 'block' : 'hidden', 'lg:block']">
        <NuxtLink
          to="/category/all"
          :class="[
            'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition',
            isAll ? 'border-brand-300 bg-brand-50 font-semibold text-brand-700' : 'border-ink-100 text-ink-600 hover:border-brand-200 hover:text-brand-700'
          ]"
        >
          <span>🗂️</span> {{ t('category.allTools') }}
        </NuxtLink>
        <CategoryCard v-for="cat in categories" :key="cat.slug" :category="cat" :active="cat.slug === slug" />
      </aside>

      <div>
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
          <div v-if="viewMode === 'grid'" class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <ToolCard v-for="tool in tools" :key="tool.slug" :tool="tool" />
          </div>
          <div v-else class="mt-2 divide-y divide-ink-100">
            <ToolListRow v-for="tool in tools" :key="tool.slug" :tool="tool" :category-label="tool.categories?.[0]?.name" />
          </div>
        </template>
        <div v-else class="mt-10 rounded-xl border border-dashed border-ink-200 py-16 text-center text-sm text-ink-400">
          {{ t('empty.noResults') }}{{ searchQuery ? ` "${searchQuery}"` : '' }}.
        </div>

        <Pagination v-model:page="page" :page-count="pageCount" />
      </div>
    </div>
  </div>
</template>
