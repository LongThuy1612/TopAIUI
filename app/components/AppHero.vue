<script setup lang="ts">
import type { ToolsResponse } from '~/types'

const { t, locale } = useI18n()
const localePath = useLocalePath()

const [{ data: totalRes }, { data: categories }, { data: popular }] = await Promise.all([
  useFetch<ToolsResponse>('/api/tools', { query: computed(() => ({ limit: 1, sort: 'newest', locale: locale.value })) }),
  useCategories(),
  // What visitors search for most (server/utils/searchTerms.ts) — intent, not tool counts.
  useFetch<string[]>('/api/search/popular', { query: computed(() => ({ locale: locale.value })) })
])
const popularSearches = computed(() => popular.value ?? [])
const nf = computed(() => new Intl.NumberFormat(locale.value))
const totalTools = computed(() => nf.value.format(totalRes.value?.total ?? 0))
const totalCategories = computed(() => nf.value.format(categories.value?.length ?? 0))

const query = ref('')
function onSearch() {
  const q = query.value.trim()
  navigateTo(localePath(q ? { path: '/search', query: { q } } : '/category/all'))
}
</script>

<template>
  <section class="flex flex-col items-center gap-5 bg-gradient-to-b from-[#FFF3F0] to-white px-4 pt-[72px] pb-14 text-center sm:px-10">
    <span class="rounded-full border border-brand-200 bg-white px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[.04em] text-brand-700">● {{ t('sections.updatedDaily') }}</span>

    <h1 class="m-0 text-[clamp(34px,4.2vw,58px)] font-extrabold leading-[1.05] tracking-[-.04em] text-ink-900 [text-wrap:balance] lg:whitespace-nowrap">
      {{ t('hero.titlePrefix') }} <span class="brand-gradient-text">{{ t('hero.titleHighlight') }}</span>{{ t('hero.titleSuffix') ? ` ${t('hero.titleSuffix')}` : '' }}
    </h1>

    <p class="m-0 max-w-[640px] text-[17px] leading-normal text-ink-700">
      {{ totalTools }} {{ t('stats.tools') }} {{ totalCategories }} {{ t('stats.categories') }} {{ t('stats.updatedNote') }}
    </p>

    <form class="mt-1.5 flex w-full max-w-[640px] items-center gap-2.5 rounded-full border border-ink-200 bg-white py-[7px] pr-[7px] pl-5 shadow-[0_10px_30px_rgba(40,20,10,.06)] transition focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-100" role="search" @submit.prevent="onSearch">
      <svg class="h-5 w-5 shrink-0 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.25" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35m1.35-5.15a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z" />
      </svg>
      <input
        v-model="query"
        type="search"
        :placeholder="t('hero.searchPlaceholder')"
        :aria-label="t('hero.searchPlaceholder')"
        class="min-w-0 flex-1 border-none bg-transparent text-[15px] text-ink-900 outline-none"
      >
      <button type="submit" class="rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600">{{ t('hero.search') }}</button>
    </form>

    <div v-if="popularSearches.length" class="flex flex-wrap justify-center gap-2">
      <NuxtLinkLocale
        v-for="term in popularSearches"
        :key="term"
        :to="{ path: '/search', query: { q: term } }"
        class="rounded-full border border-ink-200 bg-white px-3.5 py-[7px] text-[13px] font-medium text-ink-800 hover:border-ink-400"
      >
        {{ term }}
      </NuxtLinkLocale>
    </div>
  </section>
</template>
