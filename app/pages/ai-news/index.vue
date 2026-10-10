<script setup lang="ts">
import type { ArticlesResponse } from '~/types'

const { t, locale } = useI18n()
const route = useRoute()
const page = computed(() => Math.max(1, Number(route.query.page) || 1))

const { data, error } = await useFetch<ArticlesResponse>('/api/articles', {
  query: computed(() => ({ page: page.value, limit: 12 }))
})
// A DB / API failure must not be cached as an empty list (503 skips the page cache).
if (error.value) throw createError({ statusCode: 503, statusMessage: 'Service unavailable' })

const items = computed(() => data.value?.items ?? [])
const pageCount = computed(() => data.value?.pageCount ?? 1)
const formatDate = (d: string | null) => (d ? new Date(d).toLocaleDateString(locale.value, { year: 'numeric', month: 'short', day: 'numeric' }) : '')

useSeoMeta({
  title: () => `${t('aiNews.title')} — TopAICollection`,
  description: () => t('aiNews.seoDesc')
})
</script>

<template>
  <div class="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 lg:px-8">
    <nav class="flex items-center gap-1.5 text-xs text-ink-400">
      <NuxtLink to="/" class="hover:text-brand-600">{{ t('category.breadcrumbHome') }}</NuxtLink>
      <span>›</span>
      <span class="text-ink-600">{{ t('aiNews.title') }}</span>
    </nav>
    <div class="mt-3 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-3xl font-extrabold text-ink-900">{{ t('aiNews.title') }}</h1>
        <p class="mt-1 text-sm text-ink-500">{{ t('aiNews.sub') }}</p>
      </div>
      <NuxtLink to="/post-or-insert" class="rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-900 hover:border-brand-300">
        {{ t('aiNews.writeForUs') }}
      </NuxtLink>
    </div>

    <div v-if="items.length" class="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <NuxtLink
        v-for="a in items"
        :key="a.slug"
        :to="`/ai-news/${a.slug}`"
        class="group flex flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white transition hover:border-brand-200 hover:shadow-sm"
      >
        <div class="aspect-[16/9] overflow-hidden bg-brand-50">
          <img v-if="a.coverUrl" :src="a.coverUrl" :alt="a.title" loading="lazy" class="h-full w-full object-cover transition group-hover:scale-[1.02]">
          <div v-else class="flex h-full items-center justify-center text-4xl">📰</div>
        </div>
        <div class="flex flex-1 flex-col p-4">
          <div class="flex items-center gap-2 text-xs text-ink-400">
            <span>{{ formatDate(a.publishedAt) }}</span>
            <span v-if="a.kind === 'GUEST_POST'" class="rounded-full bg-ink-100 px-2 py-0.5 font-semibold text-ink-600">{{ t('aiNews.guestPost') }}</span>
          </div>
          <h2 class="mt-2 line-clamp-2 text-lg font-bold leading-snug text-ink-900 group-hover:text-brand-600">{{ a.title }}</h2>
          <p class="mt-2 line-clamp-3 text-sm text-ink-500">{{ a.excerpt }}</p>
        </div>
      </NuxtLink>
    </div>
    <div v-else class="mt-8 rounded-xl border border-dashed border-ink-200 py-16 text-center text-sm text-ink-400">
      {{ t('aiNews.empty') }}
    </div>

    <nav v-if="pageCount > 1" class="mt-10 flex flex-wrap justify-center gap-1.5">
      <NuxtLink
        v-for="p in pageCount"
        :key="p"
        :to="{ query: p === 1 ? {} : { page: p } }"
        :class="['min-w-9 rounded-lg border px-3 py-1.5 text-center text-sm font-semibold', p === page ? 'border-brand-500 bg-brand-500 text-white' : 'border-ink-200 text-ink-700 hover:border-brand-300']"
      >{{ p }}</NuxtLink>
    </nav>
  </div>
</template>
