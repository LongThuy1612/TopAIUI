<script setup lang="ts">
import type { NuxtError } from '#app'
import type { ToolsResponse } from '~/types'

// Rendered by Nuxt instead of app.vue for any unhandled error (unknown route,
// createError 404 from a page, ...), so it brings its own header and footer.
const props = defineProps<{ error: NuxtError }>()

const { t, locale } = useI18n()

// Same announcement bar as app.vue, so the page keeps the site chrome.
const { data: featuredRes } = await useFetch<ToolsResponse>('/api/tools', { query: computed(() => ({ featured: 'true', limit: 1, locale: locale.value })) })
const announcementTool = computed(() => featuredRes.value?.items?.[0])

const is404 = computed(() => props.error.statusCode === 404)

useSeoMeta({
  title: () => `${is404.value ? t('errorPage.title') : t('errorPage.errorTitle')} — TopAICollection`,
  robots: 'noindex'
})

function goHome() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <AnnouncementBar :tool="announcementTool" />
    <AppHeader />
    <main class="flex flex-1 items-center justify-center border-b border-ink-200 bg-white px-4 py-24 sm:px-6 lg:px-8">
      <div class="flex flex-col items-center gap-6 sm:flex-row sm:items-stretch sm:gap-6">
        <div class="text-5xl font-extrabold text-ink-900 sm:pr-6 sm:text-[56px] sm:leading-[64px]">
          {{ error.statusCode || 500 }}
        </div>
        <div class="flex flex-col items-center text-center sm:items-start sm:border-l sm:border-ink-200 sm:pl-6 sm:text-left">
          <h1 class="text-3xl font-extrabold text-ink-900 sm:text-5xl">
            {{ is404 ? t('errorPage.title') : t('errorPage.errorTitle') }}
          </h1>
          <p class="mt-3 text-base text-ink-900">
            {{ is404 ? t('errorPage.message') : t('errorPage.errorMessage') }}
          </p>
          <button
            type="button"
            class="mt-8 rounded-full border border-brand-500 px-4 py-2 text-base text-brand-500 transition-colors hover:bg-brand-50"
            @click="goHome"
          >
            {{ t('errorPage.backHome') }}
          </button>
        </div>
      </div>
    </main>
    <AppFooter />
  </div>
</template>
