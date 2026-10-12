<script setup lang="ts">
// Website Insights statistics (GET /api/insights/stats): basic on Starter / Professional,
// in-depth on Enterprise. Free sees a prompt to upgrade instead.
const props = defineProps<{ query: Record<string, unknown>; level: 'none' | 'basic' | 'deep' }>()
const emit = defineEmits<{ upgrade: [] }>()

const { t, locale } = useI18n()
const { authHeaders, isAdmin } = useAuth()

interface Stats {
  level: 'basic' | 'deep'
  month: string
  toolCount: number
  totalVisits: number
  totalGrowthRate: number | null
  medianGrowthRate: number | null
  topGrowth: { slug: string; name: string; growthRate: number; monthlyVisits: number }[]
  categories: { name: string; visits: number; share: number }[]
  trend?: { month: string; visits: number }[]
  growthDistribution?: { label: string; count: number }[]
  categoryGrowth?: { name: string; visits: number; growthRate: number }[]
}

const open = ref(true)
// Fetched only while the plan has statistics (Free would just get 403 on every filter change).
const { data, pending, error, execute } = useFetch<Stats | null>('/api/insights/stats', {
  headers: () => authHeaders(),
  query: computed(() => props.query),
  immediate: false,
  watch: false
})
watch([() => props.query, () => props.level], () => { if (props.level !== 'none') execute() }, { immediate: true, deep: true })

const compact = (n: number) => new Intl.NumberFormat(locale.value, { notation: 'compact', maximumFractionDigits: 1 }).format(n)
const pct = (n: number | null) => (n === null ? '—' : `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`)
const trendMax = computed(() => Math.max(1, ...(data.value?.trend ?? []).map(p => p.visits)))
const distMax = computed(() => Math.max(1, ...(data.value?.growthDistribution ?? []).map(b => b.count)))
</script>

<template>
  <section class="mt-5 rounded-xl border border-ink-100">
    <button type="button" class="flex w-full items-center justify-between px-4 py-3 text-left" @click="open = !open">
      <span class="font-bold text-ink-900">📊 {{ t('websiteInsights.statsTitle') }}
        <span v-if="level === 'deep'" class="ml-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-600">{{ t('admin.upgradeModal.feature.statisticsDeep') }}</span>
      </span>
      <svg :class="['h-4 w-4 text-ink-400 transition-transform', open && 'rotate-180']" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m19 9-7 7-7-7" /></svg>
    </button>

    <div v-if="open" class="border-t border-ink-100 p-4">
      <div v-if="level === 'none'" class="flex flex-wrap items-center justify-between gap-3 text-sm text-ink-700">
        <span>🔒 {{ t('websiteInsights.statsLocked') }}</span>
        <button v-if="!isAdmin" type="button" class="rounded-lg bg-brand-500 px-4 py-2 font-semibold text-white hover:bg-brand-600" @click="emit('upgrade')">{{ t('admin.upgrade') }}</button>
      </div>
      <p v-else-if="error" class="text-sm text-red-600">{{ error.data?.message || t('websiteInsights.loadError') }}</p>
      <p v-else-if="pending && !data" class="text-sm text-ink-400">{{ t('websiteInsights.loading') }}</p>
      <div v-else-if="data" :class="['space-y-5 text-sm', pending && 'opacity-50']">
        <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div class="rounded-lg bg-ink-100/40 p-3"><div class="text-xs text-ink-500">{{ t('websiteInsights.statTools') }}</div><div class="text-lg font-extrabold text-ink-900">{{ data.toolCount.toLocaleString(locale) }}</div></div>
          <div class="rounded-lg bg-ink-100/40 p-3"><div class="text-xs text-ink-500">{{ t('websiteInsights.statVisits') }}</div><div class="text-lg font-extrabold text-ink-900">{{ compact(data.totalVisits) }}</div></div>
          <div class="rounded-lg bg-ink-100/40 p-3"><div class="text-xs text-ink-500">{{ t('websiteInsights.statGrowth') }}</div><div :class="['text-lg font-extrabold', (data.totalGrowthRate ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600']">{{ pct(data.totalGrowthRate) }}</div></div>
          <div class="rounded-lg bg-ink-100/40 p-3"><div class="text-xs text-ink-500">{{ t('websiteInsights.statMedian') }}</div><div :class="['text-lg font-extrabold', (data.medianGrowthRate ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600']">{{ pct(data.medianGrowthRate) }}</div></div>
        </div>

        <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div>
            <h3 class="mb-2 font-bold text-ink-900">{{ t('websiteInsights.statTopGrowth') }}</h3>
            <ol class="space-y-1.5">
              <li v-for="(r, i) in data.topGrowth" :key="r.slug" class="flex items-center justify-between gap-3">
                <span class="truncate"><span class="text-ink-400">{{ i + 1 }}.</span> {{ r.name }}</span>
                <span class="shrink-0 font-semibold text-emerald-600">{{ pct(r.growthRate) }}</span>
              </li>
              <li v-if="!data.topGrowth.length" class="text-ink-400">—</li>
            </ol>
          </div>
          <div>
            <h3 class="mb-2 font-bold text-ink-900">{{ t('websiteInsights.statCategories') }}</h3>
            <div v-for="c in data.categories" :key="c.name" class="mb-1.5">
              <div class="flex justify-between gap-3"><span class="truncate">{{ c.name }}</span><span class="shrink-0 text-ink-500">{{ c.share.toFixed(1) }}%</span></div>
              <div class="mt-0.5 h-1.5 rounded-full bg-ink-100"><div class="h-full rounded-full bg-brand-400" :style="{ width: `${Math.min(100, c.share)}%` }"></div></div>
            </div>
          </div>
        </div>

        <div v-if="data.level === 'deep'" class="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div>
            <h3 class="mb-2 font-bold text-ink-900">{{ t('websiteInsights.statTrend') }}</h3>
            <div class="flex h-28 items-end gap-1">
              <div v-for="p in data.trend" :key="p.month" class="flex flex-1 flex-col items-center gap-1" :title="`${p.month}: ${compact(p.visits)}`">
                <div class="w-full rounded-t bg-blue-400" :style="{ height: `${Math.max(2, (p.visits / trendMax) * 96)}px` }"></div>
                <span class="text-[9px] text-ink-400">{{ p.month.slice(5) }}</span>
              </div>
            </div>
          </div>
          <div>
            <h3 class="mb-2 font-bold text-ink-900">{{ t('websiteInsights.statDistribution') }}</h3>
            <div v-for="b in data.growthDistribution" :key="b.label" class="mb-1.5 flex items-center gap-2">
              <span class="w-20 shrink-0 text-xs text-ink-500">{{ b.label }}</span>
              <div class="h-2 flex-1 rounded-full bg-ink-100"><div class="h-full rounded-full bg-violet-400" :style="{ width: `${(b.count / distMax) * 100}%` }"></div></div>
              <span class="w-8 shrink-0 text-right text-xs">{{ b.count }}</span>
            </div>
          </div>
          <div>
            <h3 class="mb-2 font-bold text-ink-900">{{ t('websiteInsights.statCategoryGrowth') }}</h3>
            <div v-for="c in data.categoryGrowth" :key="c.name" class="mb-1.5 flex justify-between gap-3">
              <span class="truncate">{{ c.name }}</span>
              <span :class="['shrink-0 font-semibold', c.growthRate >= 0 ? 'text-emerald-600' : 'text-red-600']">{{ pct(c.growthRate) }}</span>
            </div>
            <p v-if="!data.categoryGrowth?.length" class="text-ink-400">—</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
