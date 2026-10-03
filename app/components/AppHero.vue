<script setup lang="ts">
import type { Category, ToolsResponse } from '~/types'

const { t, locale } = useI18n()

const [{ data: totalRes }, { data: categories }] = await Promise.all([
  useFetch<ToolsResponse>('/api/tools', { query: computed(() => ({ limit: 1, sort: 'newest', locale: locale.value })) }),
  useFetch<Category[]>('/api/categories', { query: computed(() => ({ locale: locale.value })) })
])

const allCategories = computed(() => categories.value ?? [])
const totalTools = computed(() => totalRes.value?.total ?? 0)

const heroQuery = ref('')
function onSearch(q: string) {
  navigateTo({ path: '/category/all', query: q ? { q } : {} })
}
</script>

<template>
  <section class="dot-grid-bg w-full px-4 pt-[72px] pb-[76px] sm:px-6 lg:px-8">
    <div class="mx-auto max-w-[1240px] text-center">
      <div class="eyebrow inline-flex items-center gap-[9px] normal-case">
        <span class="h-1.5 w-1.5 rounded-full bg-brand-500"></span>
        <span>{{ t('sections.updatedDaily') }}</span>
      </div>

      <h1 class="mt-5 text-[clamp(20px,3.7vw,54px)] font-extrabold leading-[1.12] tracking-[-0.035em] text-ink-900">
        {{ t('hero.titlePrefix') }} <span class="brand-gradient-text">{{ t('hero.titleHighlight') }}</span>
      </h1>

      <p class="mx-auto mt-[18px] max-w-[1000px] text-[17px] leading-relaxed text-ink-800">
        <span class="font-bold text-brand-500">{{ totalTools }}</span> {{ t('stats.tools') }}
        <span class="font-bold text-brand-500">{{ allCategories.length }}</span> {{ t('stats.categories') }}
        {{ t('stats.updatedNote') }}
      </p>

      <div class="mx-auto mt-[34px] max-w-[660px]">
        <SearchBar v-model="heroQuery" :placeholder="t('hero.searchPlaceholder')" @submit="onSearch" />
      </div>

      <div v-if="allCategories.length" class="mx-auto mt-[22px] flex flex-wrap justify-center gap-2 text-[13.5px] font-medium">
        <NuxtLink
          v-for="cat in allCategories.slice(0, 8)"
          :key="cat.slug"
          :to="`/category/${cat.slug}`"
          class="rounded-full border border-ink-200 bg-white px-[15px] py-[7px] text-ink-800 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-500"
        >
          {{ cat.name }}
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
