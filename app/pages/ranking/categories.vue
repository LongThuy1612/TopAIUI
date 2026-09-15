<script setup lang="ts">
import type { Category, ToolsResponse } from '~/types'

const { t, locale } = useI18n()

const { data: categories } = await useFetch<Category[]>('/api/categories', {
  query: computed(() => ({ locale: locale.value }))
})

const allCategories = computed(() => categories.value ?? [])
const activeCategory = ref('')

watch(allCategories, (cats) => {
  if (!activeCategory.value && cats.length) activeCategory.value = cats[0]!.slug
}, { immediate: true })

const { data: toolsRes } = await useFetch<ToolsResponse>('/api/tools', {
  query: computed(() => ({ category: activeCategory.value || undefined, sort: 'traffic', limit: 100, locale: locale.value })),
  watch: [activeCategory]
})

const tools = computed(() => toolsRes.value?.items ?? [])

useSeoMeta({
  title: 'Top AI By Categories — TopAICollection'
})
</script>

<template>
  <div class="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
    <nav class="flex items-center gap-1.5 text-xs text-ink-400">
      <NuxtLink to="/" class="hover:text-brand-600">{{ t('category.breadcrumbHome') }}</NuxtLink>
      <span>›</span>
      <NuxtLink to="/ranking" class="hover:text-brand-600">{{ t('header.rankings') }}</NuxtLink>
      <span>›</span>
      <span class="text-ink-600">{{ t('rankingMenu.categoriesTitle') }}</span>
    </nav>

    <div class="mt-3">
      <h1 class="flex items-center gap-2 text-3xl font-extrabold text-ink-900">
        <span>📂</span> {{ t('ranking.categoriesTitle') }}
      </h1>
    </div>

    <div v-if="allCategories.length" class="mt-6 flex flex-wrap gap-2">
      <button
        v-for="c in allCategories"
        :key="c.slug"
        :class="[
          'rounded-full border px-4 py-1.5 text-sm font-semibold transition',
          activeCategory === c.slug ? 'border-brand-500 bg-brand-500 text-white' : 'border-ink-200 text-ink-600 hover:border-brand-300'
        ]"
        @click="activeCategory = c.slug"
      >
        {{ c.name }}
      </button>
    </div>

    <RankingTable :tools="tools" />
  </div>
</template>
