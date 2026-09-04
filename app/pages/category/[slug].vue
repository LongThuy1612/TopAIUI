<script setup lang="ts">
import type { Category, ToolsResponse } from '~/types'

const { t } = useI18n()
const route = useRoute()
const slug = computed(() => String(route.params.slug))
const isAll = computed(() => slug.value === 'all')

const { data: categories } = await useFetch<Category[]>('/api/categories')
const activeCategory = computed(() => isAll.value ? undefined : categories.value?.find(c => c.slug === slug.value))

const pricingFilter = ref<'all' | 'FREE' | 'FREEMIUM' | 'PAID'>('all')
const sortBy = ref<'newest' | 'featured' | 'name'>('newest')
const searchQuery = ref(String(route.query.q ?? ''))
const page = ref(1)

watch([pricingFilter, sortBy, searchQuery, slug], () => { page.value = 1 })

const { data: toolsRes } = await useFetch<ToolsResponse>('/api/tools', {
  query: computed(() => ({
    category: isAll.value ? undefined : slug.value,
    pricing: pricingFilter.value === 'all' ? undefined : pricingFilter.value,
    q: searchQuery.value || undefined,
    sort: sortBy.value,
    page: page.value,
    limit: 24
  }))
})

const tools = computed(() => toolsRes.value?.items ?? [])
const total = computed(() => toolsRes.value?.total ?? 0)
const pageCount = computed(() => toolsRes.value?.pageCount ?? 1)

useSeoMeta({
  title: () => isAll.value ? 'All AI Tools — Topainew' : `${activeCategory.value?.name ?? slug.value} AI Tools — Topainew`
})
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <h1 class="flex items-center gap-2 text-3xl font-extrabold text-ink-900">
        <span v-if="activeCategory">{{ activeCategory.icon }}</span>
        <span v-else>🗂️</span>
        {{ activeCategory?.name ?? (isAll ? t('category.allToolsTitle') : slug) }}
      </h1>
      <div class="w-full sm:max-w-xs">
        <SearchBar v-model="searchQuery" :placeholder="t('category.searchPlaceholder')" dense />
      </div>
    </div>

    <div class="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
      <aside class="space-y-2">
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

          <select
            v-model="sortBy"
            class="rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-sm font-semibold text-ink-600 outline-none focus:border-brand-300"
          >
            <option value="newest">{{ t('category.sortNewest') }}</option>
            <option value="featured">{{ t('category.sortFeatured') }}</option>
            <option value="name">{{ t('category.sortName') }}</option>
          </select>
        </div>

        <p class="mt-4 text-sm text-ink-400">{{ total }} {{ t('category.toolsFound', total) }}</p>

        <div v-if="tools.length" class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <ToolCard v-for="tool in tools" :key="tool.slug" :tool="tool" />
        </div>
        <div v-else class="mt-10 rounded-xl border border-dashed border-ink-200 py-16 text-center text-sm text-ink-400">
          {{ t('empty.noResults') }}{{ searchQuery ? ` "${searchQuery}"` : '' }}.
        </div>

        <Pagination v-model:page="page" :page-count="pageCount" />
      </div>
    </div>
  </div>
</template>
