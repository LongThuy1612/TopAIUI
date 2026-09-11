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
const justLaunched = computed(() => newestTools.value.slice(0, 4))
const featuredHighlights = computed(() => (featuredTools.value.length ? featuredTools.value : newestTools.value).slice(0, 5))

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

function initialsOf(name: string) {
  return name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'AI'
}

useSeoMeta({
  title: 'TopAICollection — Discover the Best AI Tools',
  description: 'Explore hundreds of AI tools by category — find the right AI for coding, writing, design, video and more.'
})
</script>

<template>
  <div>
    <section class="w-full border-b border-ink-200 bg-ink-100/60 px-4 pt-16 pb-[72px] sm:px-6 lg:px-8">
      <div class="mx-auto max-w-[1100px] text-center">
        <div class="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-[7px] text-[13px] font-semibold text-brand-600">
          <span>{{ t('sections.updatedDaily') }}</span>
        </div>

        <h1 class="mt-[22px] text-[clamp(28px,5vw,52px)] font-extrabold leading-[1.15] tracking-[-0.03em] text-ink-900">
          {{ t('hero.titlePrefix') }} <span class="brand-gradient-text">{{ t('hero.titleHighlight') }}</span>
        </h1>

        <p class="mx-auto mt-4 max-w-[820px] text-[17px] leading-relaxed text-ink-600">
          <span class="font-bold text-brand-500">{{ totalTools }}</span> {{ t('stats.tools') }} ·
          <span class="font-bold text-brand-500">{{ allCategories.length }}</span> {{ t('stats.categories') }}
        </p>

        <div class="mx-auto mt-[30px] max-w-[640px]">
          <SearchBar v-model="heroQuery" :placeholder="t('hero.searchPlaceholder')" @submit="onSearch" />
        </div>

        <div v-if="allCategories.length" class="mx-auto mt-[18px] flex flex-wrap justify-center gap-2 text-[13px]">
          <NuxtLink
            v-for="cat in allCategories.slice(0, 8)"
            :key="cat.slug"
            :to="`/category/${cat.slug}`"
            class="rounded-full bg-brand-50 px-3.5 py-1.5 text-brand-600 hover:bg-brand-100"
          >
            {{ cat.name }}
          </NuxtLink>
        </div>
      </div>
    </section>

    <section id="feed" class="w-full border-b border-ink-200 bg-white px-4 pt-8 pb-11 sm:px-6 lg:px-8">
      <div class="mx-auto grid max-w-7xl grid-cols-1 gap-7 lg:grid-cols-[240px_1fr_280px] lg:items-start">

        <aside class="flex min-w-0 flex-col gap-3.5 lg:order-1">
          <div class="text-[13px] font-bold uppercase tracking-[0.08em] text-ink-500">{{ t('sections.justLaunched') }}</div>
          <SidebarToolItem v-for="tool in justLaunched" :key="tool.slug" :tool="tool" />
          <div v-if="!justLaunched.length" class="rounded-xl border border-dashed border-ink-200 p-4 text-center text-xs text-ink-400">
            {{ t('empty.noTools') }} <code>npm run seed</code>.
          </div>
          <NuxtLink to="/new" class="text-sm font-bold text-brand-500 hover:text-brand-600">{{ t('sections.viewAll') }}</NuxtLink>
        </aside>

        <div class="min-w-0 lg:order-2 lg:border-x lg:border-ink-200 lg:px-7">
          <div class="flex flex-wrap gap-2 pb-5">
            <button
              v-for="tab in (['newest', 'featured', 'free'] as const)"
              :key="tab"
              type="button"
              class="cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition-colors"
              :class="activeTab === tab ? 'bg-brand-100 font-bold text-brand-600' : 'text-ink-600 hover:bg-ink-100'"
              @click="activeTab = tab"
            >
              {{ t(`tabs.${tab}`) }}
            </button>
          </div>

          <div v-if="tabTools.length" class="flex flex-col divide-y divide-ink-200">
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

          <div class="flex justify-center pt-7 pb-1">
            <NuxtLink :to="viewAllHref" class="rounded-[10px] bg-brand-500 px-[34px] py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-brand-600">
              {{ t('sections.viewMore') }}
            </NuxtLink>
          </div>
        </div>

        <aside class="flex min-w-0 flex-col gap-[18px] lg:order-3">
          <TopCategoriesWidget v-if="topCategories.length" :categories="topCategories" />
        </aside>
      </div>
    </section>

    <section id="categories" class="w-full bg-ink-100/60 px-4 py-16 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-7xl">
        <div class="flex flex-wrap items-baseline justify-between gap-4">
          <h2 class="text-[clamp(26px,3.2vw,38px)] font-extrabold tracking-[-0.02em] text-ink-900">{{ t('sections.browseByCategory') }}</h2>
          <NuxtLink to="/category/all" class="text-[15px] font-bold text-brand-500 hover:text-brand-600">{{ t('sections.viewAll') }}</NuxtLink>
        </div>
        <div class="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-[18px] pt-[30px]">
          <NuxtLink
            v-for="cat in allCategories"
            :key="cat.slug"
            :to="`/category/${cat.slug}`"
            class="block rounded-[14px] border border-ink-200 bg-white p-5 transition-colors hover:border-brand-500"
          >
            <span class="inline-flex h-[42px] w-[42px] items-center justify-center rounded-[11px] bg-brand-100 text-[19px] font-extrabold text-brand-600">
              <CategoryIcon :icon="cat.icon" />
            </span>
            <div class="pt-3.5 text-[17px] font-extrabold text-ink-900">{{ cat.name }}</div>
            <div class="pt-1.5 text-sm text-ink-500">{{ cat.count }}</div>
          </NuxtLink>
        </div>
      </div>
    </section>

    <section id="featured" class="w-full border-t border-ink-200 bg-white px-4 py-16 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-7xl">
        <h2 class="mb-1.5 text-[clamp(26px,3.2vw,38px)] font-extrabold tracking-[-0.02em] text-ink-900">{{ t('sections.featuredThisWeek') }}</h2>
        <p class="text-base text-ink-600">{{ t('sections.featuredThisWeekSubtitle') }}</p>
        <div v-if="featuredHighlights.length" class="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-[18px] pt-7">
          <NuxtLink
            v-for="tool in featuredHighlights"
            :key="tool.slug"
            :to="`/tools/${tool.slug}`"
            class="relative block overflow-hidden rounded-[14px] border border-brand-200 bg-brand-50 px-[22px] pt-[22px] pb-6 transition-colors hover:border-brand-500"
          >
            <span class="pointer-events-none absolute -top-1.5 -right-1 text-[86px] font-extrabold leading-none text-brand-800 opacity-[0.06]">{{ initialsOf(tool.name) }}</span>
            <div class="relative flex items-center gap-3">
              <span class="inline-flex h-8 w-8 items-center justify-center rounded-[9px] bg-brand-800 text-xs font-extrabold text-white">{{ initialsOf(tool.name) }}</span>
              <span class="text-[19px] font-extrabold text-ink-900">{{ tool.name }}</span>
            </div>
            <p v-if="tool.categories?.length" class="relative mt-3.5 text-sm leading-[1.55] text-brand-600">{{ tool.categories.map(c => c.name).join(', ') }}</p>
          </NuxtLink>
        </div>
        <div v-else class="mt-10 rounded-xl border border-dashed border-ink-200 py-16 text-center text-sm text-ink-400">
          {{ t('empty.noTools') }} <code>npm run seed</code>.
        </div>
      </div>
    </section>
  </div>
</template>
