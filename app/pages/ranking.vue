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

function formatCompact(n: number) {
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

function growthOf(tool: { last1MonthGrowth: number; last3MonthGrowth: number; last6MonthGrowth: number }) {
  const field = periodGrowthField[activePeriod.value]
  return field ? tool[field] : null
}

const rankBadge: Record<number, string> = {
  1: 'bg-amber-400 text-white',
  2: 'bg-ink-400 text-white',
  3: 'bg-amber-700 text-white'
}

useSeoMeta({
  title: 'AI Tools Ranking — TopAICollection'
})
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
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

    <div v-if="tools.length" class="mt-6 overflow-x-auto rounded-xl border border-ink-100">
      <table class="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr class="border-b border-ink-100 bg-ink-100/40 text-left text-xs font-semibold uppercase tracking-wide text-ink-400">
            <th class="px-4 py-3">{{ t('ranking.colRank') }}</th>
            <th class="px-4 py-3">{{ t('ranking.colTool') }}</th>
            <th class="px-4 py-3">{{ t('ranking.colVisits') }}</th>
            <th class="px-4 py-3">{{ t('ranking.colGrowth') }}</th>
            <th class="px-4 py-3">{{ t('ranking.colAuthority') }}</th>
            <th class="px-4 py-3">{{ t('ranking.colCategory') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(tool, i) in tools"
            :key="tool.slug"
            class="border-b border-ink-100 last:border-0 hover:bg-ink-100/30"
          >
            <td class="px-4 py-3">
              <span
                :class="[
                  'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                  rankBadge[i + 1] ?? 'bg-ink-100 text-ink-500'
                ]"
              >
                {{ i + 1 }}
              </span>
            </td>
            <td class="px-4 py-3">
              <NuxtLink :to="`/tools/${tool.slug}`" class="flex items-center gap-3 group">
                <div v-if="tool.logoUrl" class="h-8 w-8 shrink-0 overflow-hidden rounded-lg">
                  <img :src="tool.logoUrl" :alt="tool.name" class="h-full w-full object-cover">
                </div>
                <div v-else class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white">
                  {{ tool.name.slice(0, 2).toUpperCase() }}
                </div>
                <span class="font-semibold text-ink-900 group-hover:text-brand-600">{{ tool.name }}</span>
              </NuxtLink>
            </td>
            <td class="px-4 py-3 text-ink-600">{{ formatCompact(tool.monthlyVisits) }}</td>
            <td class="px-4 py-3">
              <span v-if="growthOf(tool) !== null" :class="['inline-flex items-center gap-0.5 font-semibold', (growthOf(tool) as number) >= 0 ? 'text-emerald-600' : 'text-red-500']">
                <svg class="h-3.5 w-3.5" :class="(growthOf(tool) as number) < 0 && 'rotate-180'" fill="currentColor" viewBox="0 0 20 20"><path d="M10 3l6 8h-4v6H8v-6H4l6-8z" /></svg>
                {{ Math.abs(growthOf(tool) as number).toFixed(2) }}%
              </span>
              <span v-else class="text-ink-300">—</span>
            </td>
            <td class="px-4 py-3 text-ink-600">{{ tool.domainAuthority }}</td>
            <td class="px-4 py-3 text-ink-500">{{ tool.categories?.map(c => c.name).join(', ') || '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="mt-10 rounded-xl border border-dashed border-ink-200 py-16 text-center text-sm text-ink-400">
      {{ t('ranking.noData') }}
    </div>
  </div>
</template>
