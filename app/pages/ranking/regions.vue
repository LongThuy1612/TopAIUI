<script setup lang="ts">
import type { MetaOption, ToolsResponse } from '~/types'

const { t, locale } = useI18n()

const { data: regionsRes } = await useFetch<MetaOption[]>('/api/meta/regions')

const regions = computed(() => regionsRes.value ?? [])
const activeRegion = ref('')

watch(regions, (list) => {
  if (!activeRegion.value && list.length) activeRegion.value = list[0]!.value
}, { immediate: true })

const { data: toolsRes } = await useFetch<ToolsResponse>('/api/tools', {
  query: computed(() => ({ region: activeRegion.value || undefined, sort: 'traffic', limit: 100, locale: locale.value })),
  watch: [activeRegion]
})

const tools = computed(() => (activeRegion.value ? toolsRes.value?.items ?? [] : []))

useSeoMeta({
  title: 'Top AI By Regions — TopAICollection'
})
</script>

<template>
  <div class="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
    <nav class="flex items-center gap-1.5 text-xs text-ink-400">
      <NuxtLink to="/" class="hover:text-brand-600">{{ t('category.breadcrumbHome') }}</NuxtLink>
      <span>›</span>
      <NuxtLink to="/ranking" class="hover:text-brand-600">{{ t('header.rankings') }}</NuxtLink>
      <span>›</span>
      <span class="text-ink-600">{{ t('rankingMenu.regionsTitle') }}</span>
    </nav>

    <div class="mt-3">
      <h1 class="flex items-center gap-2 text-3xl font-extrabold text-ink-900">
        <span>🌍</span> {{ t('ranking.regionsTitle') }}
      </h1>
    </div>

    <div v-if="regions.length" class="mt-6 flex flex-wrap gap-2">
      <button
        v-for="r in regions"
        :key="r.value"
        :class="[
          'rounded-full border px-4 py-1.5 text-sm font-semibold transition',
          activeRegion === r.value ? 'border-brand-500 bg-brand-500 text-white' : 'border-ink-200 text-ink-600 hover:border-brand-300'
        ]"
        @click="activeRegion = r.value"
      >
        {{ r.value }}
      </button>
    </div>

    <RankingTable v-if="regions.length" :tools="tools" />
    <div v-else class="mt-10 rounded-xl border border-dashed border-ink-200 py-16 text-center text-sm text-ink-400">
      {{ t('ranking.noData') }}
    </div>
  </div>
</template>
