<script setup lang="ts">
import type { Tool, ToolsResponse } from '~/types'

const { t, locale } = useI18n()

const { data: toolsRes } = await useFetch<ToolsResponse>('/api/tools', {
  query: computed(() => ({ sort: 'revenue', limit: 100, locale: locale.value }))
})

const tools = computed(() => toolsRes.value?.items ?? [])

function metricValue(tool: Tool) {
  return tool.monthlyRevenue ?? null
}

useSeoMeta({
  title: 'Top AI By Revenue — TopAICollection'
})
</script>

<template>
  <div class="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
    <nav class="flex items-center gap-1.5 text-xs text-ink-400">
      <NuxtLink to="/" class="hover:text-brand-600">{{ t('category.breadcrumbHome') }}</NuxtLink>
      <span>›</span>
      <NuxtLink to="/ranking" class="hover:text-brand-600">{{ t('header.rankings') }}</NuxtLink>
      <span>›</span>
      <span class="text-ink-600">{{ t('rankingMenu.revenueTitle') }}</span>
    </nav>

    <div class="mt-3">
      <h1 class="flex items-center gap-2 text-3xl font-extrabold text-ink-900">
        <span>💰</span> {{ t('ranking.revenueTitle') }}
      </h1>
    </div>

    <RankingTable :tools="tools" :metric-label="t('ranking.colRevenue')" metric-type="currency" :metric-value="metricValue" />
  </div>
</template>
