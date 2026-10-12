<script setup lang="ts">
import type { ArticleDetail } from '~/types'

const { t, locale } = useI18n()
const route = useRoute()
const slug = computed(() => String(route.params.slug))

const { data: article, error } = await useFetch<ArticleDetail>(() => `/api/articles/${slug.value}`)
if (error.value) {
  const notFound = error.value.statusCode === 404
  throw createError({ statusCode: notFound ? 404 : 503, statusMessage: notFound ? 'Article not found' : 'Service unavailable' })
}

// A link item has no page of its own: send the visitor to the outside page.
if (article.value?.externalUrl) await navigateTo(article.value.externalUrl, { external: true, redirectCode: 302 })

const { siteUrl } = useRuntimeConfig().public
const formatDate = (d: string | null) => (d ? new Date(d).toLocaleDateString(locale.value, { year: 'numeric', month: 'long', day: 'numeric' }) : '')

useSeoMeta({
  title: () => `${article.value?.title ?? ''} — TopAICollection`,
  description: () => article.value?.excerpt ?? '',
  ogTitle: () => article.value?.title ?? '',
  ogDescription: () => article.value?.excerpt ?? '',
  ogImage: () => (article.value?.coverUrl ? new URL(article.value.coverUrl, siteUrl).href : undefined),
  ogType: 'article'
})
</script>

<template>
  <div v-if="article" class="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 lg:px-8">
    <nav class="flex items-center gap-1.5 text-xs text-ink-400">
      <NuxtLink to="/" class="hover:text-brand-600">{{ t('category.breadcrumbHome') }}</NuxtLink>
      <span>›</span>
      <NuxtLink to="/ai-news" class="hover:text-brand-600">{{ t('aiNews.title') }}</NuxtLink>
    </nav>

    <div class="mt-4 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
      <article class="min-w-0">
        <h1 class="text-3xl font-extrabold leading-tight text-ink-900 sm:text-4xl">{{ article.title }}</h1>
        <div class="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink-500">
          <span v-if="article.authorName">{{ t('aiNews.by', { name: article.authorName }) }}</span>
          <span v-if="article.authorName">·</span>
          <time :datetime="article.publishedAt ?? undefined">{{ formatDate(article.publishedAt) }}</time>
          <span v-if="article.kind === 'GUEST_POST'" class="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-600">{{ t('aiNews.guestPost') }}</span>
        </div>
        <img v-if="article.coverUrl" :src="article.coverUrl" :alt="article.title" class="mt-6 aspect-[16/9] w-full rounded-2xl object-cover">
        <ArticleBody :html="article.html" class="mt-8" />
        <p v-if="article.kind === 'GUEST_POST'" class="mt-10 rounded-xl bg-ink-100/50 px-4 py-3 text-xs text-ink-500">{{ t('aiNews.guestPostNote') }}</p>
      </article>

      <aside class="space-y-6">
        <div v-if="article.related.length" class="rounded-[18px] border border-ink-200 p-5">
          <div class="border-b border-ink-100 pb-3 text-base font-semibold text-ink-900">{{ t('aiNews.latest') }}</div>
          <div class="flex flex-col gap-3 pt-3">
            <AiNewsLink v-for="r in article.related" :key="r.slug" :item="r" class="text-sm leading-snug text-ink-800 hover:text-brand-600">
              {{ r.title }}<span v-if="r.externalUrl" class="text-ink-400"> ↗</span>
            </AiNewsLink>
          </div>
        </div>
        <div class="rounded-[18px] border border-brand-100 bg-brand-50/50 p-5">
          <div class="font-semibold text-ink-900">{{ t('aiNews.writeForUs') }}</div>
          <p class="mt-1 text-sm text-ink-600">{{ t('aiNews.writeForUsSub') }}</p>
          <NuxtLink to="/post-or-insert" class="mt-3 inline-block rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">
            {{ t('aiNews.learnMore') }}
          </NuxtLink>
        </div>
      </aside>
    </div>
  </div>
</template>
