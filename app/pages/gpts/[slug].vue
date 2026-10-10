<script setup lang="ts">
import type { GptDetail } from '~/types'

const { t, locale } = useI18n()
const route = useRoute()
const slug = computed(() => String(route.params.slug))

const { data: gpt, error } = await useFetch<GptDetail>(() => `/api/gpts/${encodeURIComponent(slug.value)}`)
if (error.value) {
  const notFound = error.value.statusCode === 404
  throw createError({ statusCode: notFound ? 404 : 503, statusMessage: notFound ? 'GPT not found' : 'Service unavailable' })
}

const { siteUrl } = useRuntimeConfig().public
const initials = (name: string) => name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'G'
const formatDate = (d: string | null) => (d ? new Date(d).toLocaleDateString(locale.value, { year: 'numeric', month: 'long', day: 'numeric' }) : '')

useSeoMeta({
  title: () => `${gpt.value?.name ?? ''} — ${t('gpts.title')} — TopAICollection`,
  description: () => gpt.value?.description ?? '',
  ogTitle: () => gpt.value?.name ?? '',
  ogDescription: () => gpt.value?.description ?? '',
  ogImage: () => (gpt.value?.iconUrl ? new URL(gpt.value.iconUrl, siteUrl).href : undefined)
})
</script>

<template>
  <div v-if="gpt" class="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 lg:px-8">
    <nav class="flex items-center gap-1.5 text-xs text-ink-400">
      <NuxtLink to="/" class="hover:text-brand-600">{{ t('category.breadcrumbHome') }}</NuxtLink>
      <span>›</span>
      <NuxtLink to="/gpts" class="hover:text-brand-600">{{ t('gpts.title') }}</NuxtLink>
      <span>›</span>
      <NuxtLink :to="{ path: '/gpts', query: { category: gpt.category } }" class="hover:text-brand-600">{{ t(`gpts.categories.${gpt.category}`) }}</NuxtLink>
    </nav>

    <div class="mt-6 flex flex-col gap-6 rounded-2xl border border-ink-200 bg-white p-6 sm:flex-row sm:items-center">
      <img v-if="gpt.iconUrl" :src="gpt.iconUrl" :alt="gpt.name" class="h-24 w-24 shrink-0 rounded-full object-cover">
      <span v-else class="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-brand-50 text-2xl font-extrabold text-brand-500">{{ initials(gpt.name) }}</span>
      <div class="min-w-0 flex-1">
        <h1 class="text-3xl font-extrabold leading-tight text-ink-900">{{ gpt.name }}</h1>
        <div class="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-500">
          <span v-if="gpt.author">{{ t('gpts.by', { name: gpt.author }) }}</span>
          <span class="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-600">{{ t(`gpts.categories.${gpt.category}`) }}</span>
          <span v-if="gpt.publishedAt" class="text-xs">{{ t('gpts.added', { date: formatDate(gpt.publishedAt) }) }}</span>
        </div>
        <p class="mt-3 whitespace-pre-line text-ink-700">{{ gpt.description }}</p>
      </div>
      <a :href="gpt.url" target="_blank" rel="noopener" class="shrink-0 rounded-lg bg-brand-500 px-5 py-3 text-center text-sm font-bold text-white hover:bg-brand-600">
        {{ t('gpts.open') }} ↗
      </a>
    </div>

    <ArticleBody v-if="gpt.html" :html="gpt.html" class="mt-8 max-w-3xl" />

    <section v-if="gpt.related.length" class="mt-12">
      <h2 class="text-xl font-extrabold text-ink-900">{{ t('gpts.related') }}</h2>
      <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <GptCard v-for="g in gpt.related" :key="g.slug" :gpt="g" />
      </div>
    </section>
  </div>
</template>
