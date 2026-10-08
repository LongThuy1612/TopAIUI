<script setup lang="ts">
const { t, locale } = useI18n()
const route = useRoute()

const sorts = [
  { value: 'growth1m', label: 'ranking.byGrowth1m' },
  { value: 'growth3m', label: 'ranking.byGrowth3m' },
  { value: 'growth6m', label: 'ranking.byGrowth6m' },
  { value: 'traffic', label: 'ranking.byTraffic' }
] as const

const sort = computed(() => sorts.find(s => s.value === route.query.sort)?.value ?? 'growth1m')
// Sorting by visits still shows the 1-month change next to them.
const growthLabel = computed(() => t(sorts.find(s => s.value === sort.value && s.value !== 'traffic')?.label ?? 'ranking.byGrowth1m'))

const { data, items, pending, hasMore, loadingMore, loadMore } = await useRanking(() => ({ sort: sort.value }))

function select(value: string) {
  navigateTo({ query: { ...route.query, sort: value } }, { replace: true })
}

useSeoMeta({
  title: 'AI Tools Ranking — TopAICollection'
})
</script>

<template>
  <div class="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
    <RankingHeader icon="🏆" :title="t('ranking.title')" :month="data?.month" />
    <RankingChips :options="sorts.map(s => ({ value: s.value, label: t(s.label) }))" :active="sort" @select="select" />
    <p v-if="sort !== 'traffic' && data?.minGrowthBase" class="mt-3 text-xs text-ink-400">{{ t('ranking.growthNote', { min: (data?.minGrowthBase ?? 0).toLocaleString(locale) }) }}</p>
    <AdBannerSlot placement="ranking" class="mt-6" />
    <RankingTable :items="items" :growth-label="growthLabel" :has-more="hasMore" :loading-more="loadingMore" :loading="pending" @load-more="loadMore" />
  </div>
</template>
