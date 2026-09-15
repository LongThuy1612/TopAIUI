<script setup lang="ts">
import type { ToolsResponse } from '~/types'

const { t, locale } = useI18n()

const periods = ['growth1m', 'growth3m', 'growth6m', 'traffic'] as const
type Period = (typeof periods)[number]
const periodLabels: Record<Period, string> = {
  growth1m: 'ranking.byGrowth1m',
  growth3m: 'ranking.byGrowth3m',
  growth6m: 'ranking.byGrowth6m',
  traffic: 'ranking.byTraffic'
}
const periodGrowthField: Record<Period, 'last1MonthGrowth' | 'last3MonthGrowth' | 'last6MonthGrowth' | null> = {
  growth1m: 'last1MonthGrowth',
  growth3m: 'last3MonthGrowth',
  growth6m: 'last6MonthGrowth',
  traffic: null
}

const activePeriod = ref<Period>('growth1m')

const { data: toolsRes } = await useFetch<ToolsResponse>('/api/tools', {
  query: computed(() => ({ sort: activePeriod.value, limit: 300, locale: locale.value }))
})

const tools = computed(() => toolsRes.value?.items ?? [])

const monthLabel = computed(() => new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' }))

const showMetricColumn = computed(() => periodGrowthField[activePeriod.value] !== null)
const metricLabel = computed(() => (showMetricColumn.value ? t('ranking.colGrowth') : undefined))

function metricValue(tool: { last1MonthGrowth: number; last3MonthGrowth: number; last6MonthGrowth: number }) {
  const field = periodGrowthField[activePeriod.value]
  return field ? tool[field] : null
}

useSeoMeta({
  title: 'AI Tools Ranking — TopAICollection'
})
</script>

<template>
  <div class="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
    <nav class="flex items-center gap-1.5 text-xs text-ink-400">
      <NuxtLink to="/" class="hover:text-brand-600">{{ t('category.breadcrumbHome') }}</NuxtLink>
      <span>›</span>
      <span class="text-ink-600">{{ t('header.rankings') }}</span>
    </nav>

    <div class="mt-3">
      <h1 class="flex items-center gap-2 text-3xl font-extrabold text-ink-900">
        <span>🏆</span> {{ t('ranking.title') }} — {{ monthLabel }}
      </h1>
      <p class="mt-1.5 max-w-2xl text-sm text-ink-500">{{ t('ranking.subtitle') }}</p>
    </div>

    <div class="mt-6 flex flex-wrap gap-2">
      <button
        v-for="p in periods"
        :key="p"
        :class="[
          'rounded-full border px-4 py-1.5 text-sm font-semibold transition',
          activePeriod === p ? 'border-brand-500 bg-brand-500 text-white' : 'border-ink-200 text-ink-600 hover:border-brand-300'
        ]"
        @click="activePeriod = p"
      >
        {{ t(periodLabels[p]) }}
      </button>
    </div>

    <RankingTable :tools="tools" :metric-label="metricLabel" metric-type="growth" :metric-value="metricValue" />
  </div>
</template>
