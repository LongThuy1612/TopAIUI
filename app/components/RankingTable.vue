<script setup lang="ts">
import type { RankingItem } from '~/types'

withDefaults(defineProps<{
  items: RankingItem[]
  growthLabel?: string
  /** Heading of the visits-from-country/source column; the column is hidden without it. */
  scoreLabel?: string
  hasMore?: boolean
  loadingMore?: boolean
  loading?: boolean
}>(), {
  growthLabel: undefined,
  scoreLabel: undefined,
  hasMore: false,
  loadingMore: false,
  loading: false
})

defineEmits<{ loadMore: [] }>()

const { t, locale } = useI18n()

const rankBadge: Record<number, string> = {
  1: 'bg-amber-400 text-white',
  2: 'bg-ink-400 text-white',
  3: 'bg-amber-700 text-white'
}

function formatCompact(n: number) {
  return new Intl.NumberFormat(locale.value, { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

function formatGrowth(n: number) {
  return `${Math.abs(n) >= 100 ? Math.round(Math.abs(n)).toLocaleString(locale.value) : Math.abs(n).toFixed(1)}%`
}
</script>

<template>
  <div v-if="items.length" class="mt-6" :class="loading && 'opacity-60 transition-opacity'">
    <div class="overflow-x-auto rounded-xl border border-ink-100">
      <table class="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr class="border-b border-ink-100 bg-ink-100/40 text-left text-xs font-semibold uppercase tracking-wide text-ink-400">
            <th class="w-16 px-4 py-3">{{ t('ranking.colRank') }}</th>
            <th class="px-4 py-3">{{ t('ranking.colTool') }}</th>
            <th v-if="scoreLabel" class="px-4 py-3">{{ scoreLabel }}</th>
            <th class="px-4 py-3">{{ t('ranking.colVisits') }}</th>
            <th class="px-4 py-3">{{ growthLabel ?? t('ranking.colGrowth') }}</th>
            <th class="px-4 py-3">{{ t('ranking.colCategory') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in items"
            :key="item.slug"
            class="border-b border-ink-100 last:border-0 hover:bg-ink-100/30"
          >
            <td class="px-4 py-3">
              <span
                :class="[
                  'flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-bold',
                  rankBadge[item.rank] ?? 'bg-ink-100 text-ink-500'
                ]"
              >
                {{ item.rank }}
              </span>
            </td>
            <td class="px-4 py-3">
              <NuxtLinkLocale :to="`/tools/${item.slug}`" class="group flex items-center gap-3">
                <div v-if="item.logoUrl" class="h-8 w-8 shrink-0 overflow-hidden rounded-lg">
                  <img data-logo :src="sizedImage(item.logoUrl, 64, 64)" :alt="item.name" loading="lazy" class="h-full w-full object-cover">
                </div>
                <div v-else class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white">
                  {{ item.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'AI' }}
                </div>
                <span class="font-semibold text-ink-900 group-hover:text-brand-600">{{ item.name }}</span>
              </NuxtLinkLocale>
            </td>
            <td v-if="scoreLabel" class="px-4 py-3">
              <span class="font-semibold text-ink-800">{{ formatCompact(item.score) }}</span>
              <span v-if="item.share != null" class="ml-1.5 text-xs text-ink-400">{{ item.share.toFixed(1) }}%</span>
            </td>
            <td class="px-4 py-3 text-ink-600">{{ formatCompact(item.visits) }}</td>
            <td class="px-4 py-3">
              <span
                v-if="item.growth != null"
                :class="['inline-flex items-center gap-0.5 font-semibold', item.growth >= 0 ? 'text-emerald-600' : 'text-red-500']"
              >
                <svg class="h-3.5 w-3.5" :class="item.growth < 0 && 'rotate-180'" fill="currentColor" viewBox="0 0 20 20"><path d="M10 3l6 8h-4v6H8v-6H4l6-8z" /></svg>
                {{ formatGrowth(item.growth) }}
              </span>
              <span v-else class="text-ink-300">—</span>
            </td>
            <td class="px-4 py-3 text-ink-500">
              <template v-if="item.categories.length">
                <template v-for="(c, i) in item.categories" :key="c.slug">
                  <NuxtLinkLocale :to="`/category/${c.slug}`" class="hover:text-brand-600">{{ c.name }}</NuxtLinkLocale><span v-if="i < item.categories.length - 1">, </span>
                </template>
              </template>
              <span v-else>—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="hasMore" class="mt-6 flex justify-center">
      <button
        type="button"
        class="rounded-full border border-ink-200 px-6 py-2 text-sm font-semibold text-ink-700 transition hover:border-brand-300 hover:text-brand-600 disabled:opacity-50"
        :disabled="loadingMore"
        @click="$emit('loadMore')"
      >
        {{ loadingMore ? t('ranking.loading') : t('ranking.loadMore') }}
      </button>
    </div>
  </div>
  <div v-else class="mt-10 rounded-xl border border-dashed border-ink-200 py-16 text-center text-sm text-ink-400">
    {{ t('ranking.noData') }}
  </div>
</template>
