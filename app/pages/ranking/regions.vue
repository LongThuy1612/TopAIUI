<script setup lang="ts">
const { t, locale } = useI18n()
const route = useRoute()

const { data: filters } = await useRankingFilters()
const options = computed(() => (filters.value?.countries ?? []).map(c => ({ value: c.code, label: countryName(c.code, locale.value), count: c.count })))
const active = computed(() => String(route.query.country ?? '').toUpperCase() || options.value[0]?.value || '')

const { data, items, pending, hasMore, loadingMore, loadMore, reachedLimit } = await useRanking(() => ({ country: active.value || undefined }))

function select(value: string) {
  navigateTo({ query: { ...route.query, country: value } }, { replace: true })
}

useSeoMeta({
  title: 'Top AI By Regions — TopAICollection',
  description: 'The most visited AI tools in each country and region, ranked by website traffic.',
  ogTitle: 'Top AI By Regions — TopAICollection',
  ogDescription: 'The most visited AI tools in each country and region, ranked by website traffic.'
})
</script>

<template>
  <div class="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
    <RankingHeader :crumb="t('rankingMenu.regionsTitle')" icon="🌍" :title="t('ranking.regionsTitle')" :month="data?.month" />
    <RankingChips :options="options" :active="active" @select="select" />
    <AdBannerSlot placement="ranking" class="mt-6" />
    <RankingTable
      :items="active ? items : []"
      :score-label="active ? t('ranking.colVisitsFrom', { name: countryName(active, locale) }) : undefined"
      :growth-label="t('ranking.byGrowth1m')"
      :has-more="hasMore"
      :loading-more="loadingMore"
      :loading="pending"
      @load-more="loadMore"
    />
    <RankingLimitNotice v-if="reachedLimit" :limit="reachedLimit" />
  </div>
</template>
