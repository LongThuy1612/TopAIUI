<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()

const { data: filters } = await useRankingFilters()
const options = computed(() => (filters.value?.categories ?? []).map(c => ({ value: c.slug, label: c.name, count: c.count })))
const active = computed(() => String(route.query.category ?? '') || options.value[0]?.value || '')

const { data, items, pending, hasMore, loadingMore, loadMore, reachedLimit } = await useRanking(() => ({ category: active.value || undefined }))

function select(value: string) {
  navigateTo({ query: { ...route.query, category: value } }, { replace: true })
}

useSeoMeta({
  title: 'Top AI By Categories — TopAICollection',
  description: 'Top AI tools in every category, ranked by monthly website traffic.',
  ogTitle: 'Top AI By Categories — TopAICollection',
  ogDescription: 'Top AI tools in every category, ranked by monthly website traffic.'
})
</script>

<template>
  <div class="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
    <RankingHeader :crumb="t('rankingMenu.categoriesTitle')" icon="📂" :title="t('ranking.categoriesTitle')" :month="data?.month" />
    <RankingChips :options="options" :active="active" @select="select" />
    <AdBannerSlot placement="ranking" class="mt-6" />
    <RankingTable :items="active ? items : []" :growth-label="t('ranking.byGrowth1m')" :has-more="hasMore" :loading-more="loadingMore" :loading="pending" @load-more="loadMore" />
    <RankingLimitNotice v-if="reachedLimit" :limit="reachedLimit" />
  </div>
</template>
