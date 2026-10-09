<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()

const { data: filters } = await useRankingFilters()
const options = computed(() => (filters.value?.sources ?? []).map(s => ({ value: s.name, label: s.name, count: s.count })))
const active = computed(() => String(route.query.source ?? '') || options.value[0]?.value || '')

const { data, items, pending, hasMore, loadingMore, loadMore, reachedLimit } = await useRanking(() => ({ source: active.value || undefined }))

function select(value: string) {
  navigateTo({ query: { ...route.query, source: value } }, { replace: true })
}

useSeoMeta({
  title: 'Top AI By Source — TopAICollection'
})
</script>

<template>
  <div class="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
    <RankingHeader :crumb="t('rankingMenu.sourceTitle')" icon="📊" :title="t('ranking.sourceTitle')" :month="data?.month" />
    <RankingChips :options="options" :active="active" @select="select" />
    <AdBannerSlot placement="ranking" class="mt-6" />
    <RankingTable
      :items="active ? items : []"
      :score-label="active ? t('ranking.colVisitsFrom', { name: active }) : undefined"
      :growth-label="t('ranking.byGrowth1m')"
      :has-more="hasMore"
      :loading-more="loadingMore"
      :loading="pending"
      @load-more="loadMore"
    />
    <RankingLimitNotice v-if="reachedLimit" :limit="reachedLimit" />
  </div>
</template>
