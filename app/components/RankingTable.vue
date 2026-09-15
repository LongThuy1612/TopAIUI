<script setup lang="ts">
import type { Tool } from '~/types'

const props = withDefaults(defineProps<{
  tools: Tool[]
  metricLabel?: string
  metricType?: 'growth' | 'number' | 'currency'
  metricValue?: (tool: Tool) => number | null
}>(), {
  metricLabel: undefined,
  metricType: 'number',
  metricValue: undefined
})

const { t } = useI18n()

const rankBadge: Record<number, string> = {
  1: 'bg-amber-400 text-white',
  2: 'bg-ink-400 text-white',
  3: 'bg-amber-700 text-white'
}

function formatCompact(n: number) {
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

function metricOf(tool: Tool): number | null {
  return props.metricValue ? props.metricValue(tool) : null
}
</script>

<template>
  <div v-if="tools.length" class="mt-6 overflow-x-auto rounded-xl border border-ink-100">
    <table class="w-full min-w-[720px] border-collapse text-sm">
      <thead>
        <tr class="border-b border-ink-100 bg-ink-100/40 text-left text-xs font-semibold uppercase tracking-wide text-ink-400">
          <th class="px-4 py-3">{{ t('ranking.colRank') }}</th>
          <th class="px-4 py-3">{{ t('ranking.colTool') }}</th>
          <th class="px-4 py-3">{{ t('ranking.colVisits') }}</th>
          <th v-if="metricLabel" class="px-4 py-3">{{ metricLabel }}</th>
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
          <td v-if="metricLabel" class="px-4 py-3">
            <template v-if="metricType === 'growth'">
              <span v-if="metricOf(tool) !== null" :class="['inline-flex items-center gap-0.5 font-semibold', (metricOf(tool) as number) >= 0 ? 'text-emerald-600' : 'text-red-500']">
                <svg class="h-3.5 w-3.5" :class="(metricOf(tool) as number) < 0 && 'rotate-180'" fill="currentColor" viewBox="0 0 20 20"><path d="M10 3l6 8h-4v6H8v-6H4l6-8z" /></svg>
                {{ Math.abs(metricOf(tool) as number).toFixed(2) }}%
              </span>
              <span v-else class="text-ink-300">—</span>
            </template>
            <template v-else-if="metricType === 'currency'">
              <span class="font-semibold text-ink-800">{{ metricOf(tool) !== null ? formatCurrency(metricOf(tool) as number) : '—' }}</span>
            </template>
            <template v-else>
              <span class="text-ink-600">{{ metricOf(tool) !== null ? formatCompact(metricOf(tool) as number) : '—' }}</span>
            </template>
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
</template>
