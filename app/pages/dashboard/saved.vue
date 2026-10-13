<script setup lang="ts">
import type { ToolsResponse } from '~/types'

const { t, locale } = useI18n()
definePageMeta({ layout: 'dashboard', middleware: 'auth' })
const { authHeaders } = useAuth()

// The tools the user starred (GET /api/me/saved), most recently saved first.
const page = ref(1)
const { data, pending, error, refresh } = await useFetch<ToolsResponse>('/api/me/saved', {
  headers: () => authHeaders(),
  query: computed(() => ({ page: page.value, limit: 24, locale: locale.value }))
})
const tools = computed(() => data.value?.items ?? [])
const pageCount = computed(() => data.value?.pageCount ?? 1)

const removing = ref<string | null>(null)
async function unsave(slug: string) {
  if (removing.value) return
  removing.value = slug
  try {
    await $fetch(`/api/tools/${slug}/save`, { method: 'POST', headers: authHeaders(), body: { saved: false } })
    // Removing the last tool of a later page: step back to the one before.
    if (tools.value.length === 1 && page.value > 1) page.value -= 1
    else await refresh()
  } catch {
    // the list stays as it was; the user can try again
  } finally {
    removing.value = null
  }
}

useSeoMeta({ title: () => `${t('savedPage.title')} — TopAICollection` })
</script>

<template>
  <div>
    <h1 class="text-xl font-extrabold text-ink-900">{{ t('savedPage.title') }}</h1>
    <p class="mt-1 text-sm text-ink-500">{{ t('savedPage.subtitle', { n: data?.total ?? 0 }) }}</p>

    <p v-if="error" class="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{{ t('auth.registerError') }}</p>

    <div v-if="tools.length" class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
      <div v-for="tool in tools" :key="tool.id" class="flex flex-col gap-2">
        <ToolCard :tool="tool" featured class="flex-1" />
        <button
          type="button"
          :disabled="removing === tool.slug"
          class="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
          @click="unsave(tool.slug)"
        >
          {{ t('savedPage.remove') }}
        </button>
      </div>
    </div>
    <p v-else-if="pending" class="py-10 text-center text-sm text-ink-400">…</p>
    <div v-else-if="!error" class="mt-5 rounded-xl border border-dashed border-ink-200 px-4 py-14 text-center">
      <p class="text-sm text-ink-500">{{ t('savedPage.empty') }}</p>
      <NuxtLinkLocale to="/most-saved" class="mt-3 inline-block text-sm font-semibold text-brand-600 hover:text-brand-700">
        {{ t('productsMenu.savedTitle') }} →
      </NuxtLinkLocale>
    </div>

    <div v-if="pageCount > 1" class="mt-8 flex justify-center">
      <Pagination v-model:page="page" :page-count="pageCount" />
    </div>
  </div>
</template>
