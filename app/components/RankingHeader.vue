<script setup lang="ts">
defineProps<{
  /** Breadcrumb label of a sub-ranking page; omitted on /ranking itself. */
  crumb?: string
  icon: string
  title: string
  month?: string | null
}>()

const { t, locale } = useI18n()
</script>

<template>
  <nav class="flex items-center gap-1.5 text-xs text-ink-400">
    <NuxtLink to="/" class="hover:text-brand-600">{{ t('category.breadcrumbHome') }}</NuxtLink>
    <span>›</span>
    <NuxtLink v-if="crumb" to="/ranking" class="hover:text-brand-600">{{ t('header.rankings') }}</NuxtLink>
    <span v-else class="text-ink-600">{{ t('header.rankings') }}</span>
    <template v-if="crumb">
      <span>›</span>
      <span class="text-ink-600">{{ crumb }}</span>
    </template>
  </nav>

  <div class="mt-3">
    <h1 class="flex items-center gap-2 text-3xl font-extrabold text-ink-900">
      <span>{{ icon }}</span> {{ title }}
    </h1>
    <p class="mt-1.5 max-w-2xl text-sm text-ink-500">
      {{ t('ranking.subtitle') }}
      <template v-if="month"> {{ t('ranking.dataMonth', { month: formatRankingMonth(month, locale) }) }}</template>
    </p>
  </div>
</template>
