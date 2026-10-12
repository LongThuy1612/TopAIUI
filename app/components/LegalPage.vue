<script setup lang="ts">
import { markdownRenderer } from '#shared/markdown'
import { SUPPORT_EMAIL } from '#shared/site'

// Terms, Privacy, Editorial Guidelines, Review Methodology: English Markdown in
// app/content/legal/*.md (legal text is kept in one language so every reader sees
// the same document). The first "# Title" line becomes the page's <h1>.
const props = defineProps<{ source: string; seoTitle: string; seoDescription: string }>()

const { t, locale } = useI18n()
const { siteUrl } = useRuntimeConfig().public

const filled = computed(() => props.source
  .replaceAll('%SUPPORT_EMAIL%', SUPPORT_EMAIL)
  .replaceAll('%SITE_URL%', siteUrl.replace(/\/+$/, '')))
const heading = computed(() => filled.value.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? props.seoTitle)
const html = computed(() => markdownRenderer('dofollow').render(filled.value.replace(/^#\s+.+$/m, '')))

const route = useRoute()
useBreadcrumbLd(() => [[props.seoTitle, route.path]])

useSeoMeta({
  title: () => `${props.seoTitle} — TopAICollection`,
  description: () => props.seoDescription,
  ogTitle: () => props.seoTitle,
  ogDescription: () => props.seoDescription
})
</script>

<template>
  <div class="mx-auto max-w-[860px] px-4 py-10 sm:px-6 lg:px-8">
    <nav class="flex items-center gap-1.5 text-xs text-ink-400">
      <NuxtLink to="/" class="hover:text-brand-600">{{ t('category.breadcrumbHome') }}</NuxtLink>
      <span>›</span>
      <span>{{ seoTitle }}</span>
    </nav>
    <h1 class="mt-4 text-3xl font-extrabold leading-tight text-ink-900 sm:text-4xl" lang="en">{{ heading }}</h1>
    <p v-if="locale !== 'en'" class="mt-4 rounded-xl bg-ink-100/60 px-4 py-2.5 text-sm text-ink-600">{{ t('legalPage.englishOnly') }}</p>
    <ArticleBody :html="html" class="mt-8" lang="en" />
  </div>
</template>
