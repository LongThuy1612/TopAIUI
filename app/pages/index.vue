<script setup lang="ts">
import type { Category, ToolsResponse } from '~/types'

const { t } = useI18n()

const [{ data: newestRes }, { data: featuredRes }, { data: freeRes }, { data: categories }] = await Promise.all([
  useFetch<ToolsResponse>('/api/tools', { query: { limit: 20, sort: 'newest' } }),
  useFetch<ToolsResponse>('/api/tools', { query: { featured: 'true', limit: 20 } }),
  useFetch<ToolsResponse>('/api/tools', { query: { pricing: 'FREE', limit: 20, sort: 'newest' } }),
  useFetch<Category[]>('/api/categories')
])

const newestTools = computed(() => newestRes.value?.items ?? [])
const featuredTools = computed(() => featuredRes.value?.items ?? [])
const freeTools = computed(() => freeRes.value?.items ?? [])
const allCategories = computed(() => categories.value ?? [])
const totalTools = computed(() => newestRes.value?.total ?? 0)

const topCategories = computed(() =>
  [...allCategories.value].sort((a, b) => b.count - a.count).slice(0, 7)
)
const sidebarTools = computed(() => (featuredTools.value.length ? featuredTools.value : newestTools.value).slice(0, 4))

const activeTab = ref<'newest' | 'featured' | 'free'>('newest')
const tabLists = { newest: newestTools, featured: featuredTools, free: freeTools }
const tabTools = computed(() => tabLists[activeTab.value].value.slice(0, 10))

const viewAllHref = computed(() => {
  if (activeTab.value === 'newest') return { path: '/new' }
  if (activeTab.value === 'featured') return { path: '/featured' }
  return { path: '/free' }
})

const heroQuery = ref('')
function onSearch(q: string) {
  navigateTo({ path: '/category/all', query: q ? { q } : {} })
}

useSeoMeta({
  title: 'TopAICollection — Discover the Best AI Tools',
  description: 'Explore hundreds of AI tools by category — find the right AI for coding, writing, design, video and more.'
})
</script>

<template>
  <div>
    <section class="border-b border-ink-100 bg-gradient-to-b from-brand-50/60 to-white py-14 text-center sm:py-16">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 class="text-4xl font-extrabold tracking-tight text-ink-900 sm:text-6xl">
          {{ t('hero.titlePrefix') }} <span class="text-brand-600">{{ t('hero.titleHighlight') }}</span>
        </h1>
        <p class="mx-auto mt-4 max-w-xl text-base text-ink-600 sm:text-lg">
          <span class="font-semibold text-brand-600">{{ totalTools }}</span> {{ t('stats.tools') }} · <span class="font-semibold text-brand-600">{{ allCategories.length }}</span> {{ t('stats.categories') }}
        </p>

        <div class="mx-auto mt-8 max-w-xl">
          <SearchBar v-model="heroQuery" :placeholder="t('hero.searchPlaceholder')" @submit="onSearch" />
        </div>

        <div v-if="allCategories.length" class="mt-6 flex flex-wrap items-center justify-center gap-2">
          <CategoryPill v-for="cat in allCategories.slice(0, 8)" :key="cat.slug" :category="cat" />
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr_280px]">
        <aside class="space-y-3 lg:order-1">
          <SidebarToolItem v-for="tool in sidebarTools" :key="tool.slug" :tool="tool" />
          <div v-if="!sidebarTools.length" class="rounded-xl border border-dashed border-ink-200 p-4 text-center text-xs text-ink-400">
            {{ t('empty.noTools') }} <code>npm run seed</code>.
          </div>
        </aside>

        <div class="lg:order-2">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 pb-3">
            <div class="flex gap-1">
              <button
                v-for="tab in (['newest', 'featured', 'free'] as const)"
                :key="tab"
                :class="[
                  'rounded-full px-3.5 py-1.5 text-sm font-semibold transition',
                  activeTab === tab ? 'bg-brand-500 text-white' : 'text-ink-600 hover:bg-ink-100'
                ]"
                @click="activeTab = tab"
              >
                {{ t(`tabs.${tab}`) }}
              </button>
            </div>
            <NuxtLink :to="viewAllHref" class="text-sm font-semibold text-brand-600 hover:text-brand-700">{{ t('tabs.viewAll') }}</NuxtLink>
          </div>

          <div v-if="tabTools.length" class="mt-2 divide-y divide-ink-100">
            <ToolListRow
              v-for="tool in tabTools"
              :key="tool.slug"
              :tool="tool"
              :category-label="tool.categories?.[0]?.name"
            />
          </div>
          <div v-else class="mt-10 rounded-xl border border-dashed border-ink-200 py-16 text-center text-sm text-ink-400">
            {{ t('empty.noTools') }} <code>npm run seed</code>.
          </div>
        </div>

        <aside class="space-y-4 lg:order-3">
          <TopCategoriesWidget v-if="topCategories.length" :categories="topCategories" />
        </aside>
      </div>
    </section>

    <section class="border-y border-ink-100 bg-ink-100/40 py-14">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 class="text-2xl font-bold text-ink-900">{{ t('sections.browseByCategory') }}</h2>
        <div class="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <CategoryCard v-for="cat in allCategories" :key="cat.slug" :category="cat" />
        </div>
      </div>
    </section>

    <section class="border-t border-ink-100 bg-brand-600 py-14 text-center">
      <div class="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <h2 class="text-3xl font-extrabold text-white">{{ t('cta.title') }}</h2>
        <p class="mt-2 text-base text-brand-100">{{ t('cta.subtitle') }}</p>
        <NuxtLink to="/submit" class="mt-6 inline-block rounded-full bg-white px-6 py-3 text-sm font-semibold text-brand-700 transition hover:bg-brand-50">
          {{ t('cta.button') }}
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
