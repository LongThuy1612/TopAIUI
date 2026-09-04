<script setup lang="ts">
import type { ToolsResponse } from '~/types'

const { t } = useI18n()

const sortValues = ['newest', 'featured', 'name'] as const
const sortBy = ref<'newest' | 'featured' | 'name'>('newest')
const viewMode = ref<'grid' | 'list'>('grid')
const page = ref(1)

watch(sortBy, () => { page.value = 1 })

const { data: toolsRes } = await useFetch<ToolsResponse>('/api/tools', {
  query: computed(() => ({
    pricing: 'FREE',
    sort: sortBy.value,
    page: page.value,
    limit: 24
  }))
})

const tools = computed(() => toolsRes.value?.items ?? [])
const total = computed(() => toolsRes.value?.total ?? 0)
const pageCount = computed(() => toolsRes.value?.pageCount ?? 1)

useSeoMeta({
  title: 'Free AI Tools — TopAICollection'
})
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
    <nav class="flex items-center gap-1.5 text-xs text-ink-400">
      <NuxtLink to="/" class="hover:text-brand-600">{{ t('category.breadcrumbHome') }}</NuxtLink>
      <span>›</span>
      <span class="text-ink-600">{{ t('tabs.free') }}</span>
    </nav>

    <div class="mt-3">
      <h1 class="flex items-center gap-2 text-3xl font-extrabold text-ink-900">
        <span>🆓</span> {{ t('tabs.free') }}
      </h1>
      <p class="mt-1.5 text-sm text-ink-500">{{ total }} {{ t('category.toolsFound', total) }}</p>
    </div>

    <div class="mt-8 flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 pb-4">
      <select
        v-model="sortBy"
        class="rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-sm font-semibold text-ink-600 outline-none focus:border-brand-300"
      >
        <option v-for="s in sortValues" :key="s" :value="s">{{ t(`category.sort${s === 'newest' ? 'Newest' : s === 'featured' ? 'Featured' : 'Name'}`) }}</option>
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

    <template v-if="tools.length">
      <div v-if="viewMode === 'grid'" class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <ToolCard v-for="tool in tools" :key="tool.slug" :tool="tool" />
      </div>
      <div v-else class="mt-2 divide-y divide-ink-100">
        <ToolListRow v-for="tool in tools" :key="tool.slug" :tool="tool" :category-label="tool.categories?.[0]?.name" />
      </div>
    </template>
    <div v-else class="mt-10 rounded-xl border border-dashed border-ink-200 py-16 text-center text-sm text-ink-400">
      {{ t('empty.noResults') }}.
    </div>

    <Pagination v-model:page="page" :page-count="pageCount" />
  </div>
</template>
