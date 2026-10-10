<script setup lang="ts">
import type { GptsResponse } from '~/types'
import { GPT_CATEGORIES } from '#shared/gpts'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const page = computed(() => Math.max(1, Number(route.query.page) || 1))
const category = computed(() => (GPT_CATEGORIES as readonly string[]).includes(String(route.query.category)) ? String(route.query.category) : '')
const q = computed(() => (typeof route.query.q === 'string' ? route.query.q : ''))
const search = ref(q.value)
watch(q, (v) => { search.value = v })

const { data, error } = await useFetch<GptsResponse>('/api/gpts', {
  query: computed(() => ({ page: page.value, limit: 24, ...(category.value ? { category: category.value } : {}), ...(q.value ? { q: q.value } : {}) }))
})
// A DB / API failure must not be cached as an empty list (503 skips the page cache).
if (error.value) throw createError({ statusCode: 503, statusMessage: 'Service unavailable' })

const items = computed(() => data.value?.items ?? [])
const pageCount = computed(() => data.value?.pageCount ?? 1)

function go(next: { category?: string; q?: string; page?: number }) {
  const query: Record<string, string> = {}
  const c = next.category ?? category.value
  const s = next.q ?? q.value
  if (c) query.category = c
  if (s) query.q = s
  if (next.page && next.page > 1) query.page = String(next.page)
  router.push({ query })
}

useSeoMeta({
  title: () => `${t('gpts.title')} — TopAICollection`,
  description: () => t('gpts.seoDesc')
})
</script>

<template>
  <div class="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 lg:px-8">
    <nav class="flex items-center gap-1.5 text-xs text-ink-400">
      <NuxtLink to="/" class="hover:text-brand-600">{{ t('category.breadcrumbHome') }}</NuxtLink>
      <span>›</span>
      <span class="text-ink-600">{{ t('gpts.title') }}</span>
    </nav>
    <div class="mt-3 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-3xl font-extrabold text-ink-900">{{ t('gpts.title') }}</h1>
        <p class="mt-1 text-sm text-ink-500">{{ t('gpts.sub') }}</p>
      </div>
      <NuxtLink to="/submit-gpt" class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">
        {{ t('gpts.submit') }}
      </NuxtLink>
    </div>

    <form class="mt-6 flex max-w-xl gap-2" @submit.prevent="go({ q: search.trim(), page: 1 })">
      <input v-model="search" type="search" maxlength="80" :placeholder="t('gpts.searchPlaceholder')" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400">
      <button type="submit" class="rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-900 hover:border-brand-300">{{ t('gpts.search') }}</button>
    </form>

    <div class="mt-4 flex flex-wrap gap-2">
      <button
        type="button"
        :class="['rounded-full border px-3 py-1.5 text-sm font-semibold transition', !category ? 'border-brand-500 bg-brand-500 text-white' : 'border-ink-200 text-ink-600 hover:border-brand-300']"
        @click="go({ category: '', page: 1 })"
      >{{ t('gpts.all') }}</button>
      <button
        v-for="c in GPT_CATEGORIES"
        :key="c"
        type="button"
        :class="['rounded-full border px-3 py-1.5 text-sm font-semibold transition', category === c ? 'border-brand-500 bg-brand-500 text-white' : 'border-ink-200 text-ink-600 hover:border-brand-300']"
        @click="go({ category: c, page: 1 })"
      >{{ t(`gpts.categories.${c}`) }}</button>
    </div>

    <div v-if="items.length" class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <GptCard v-for="g in items" :key="g.slug" :gpt="g" />
    </div>
    <div v-else class="mt-6 rounded-xl border border-dashed border-ink-200 py-16 text-center text-sm text-ink-400">
      {{ q || category ? t('gpts.noResults') : t('gpts.empty') }}
    </div>

    <nav v-if="pageCount > 1" class="mt-10 flex flex-wrap justify-center gap-1.5">
      <button
        v-for="p in pageCount"
        :key="p"
        type="button"
        :class="['min-w-9 rounded-lg border px-3 py-1.5 text-center text-sm font-semibold', p === page ? 'border-brand-500 bg-brand-500 text-white' : 'border-ink-200 text-ink-700 hover:border-brand-300']"
        @click="go({ page: p })"
      >{{ p }}</button>
    </nav>
  </div>
</template>
