<script setup lang="ts">
import type { AdminToolsResponse } from '~/types'

const { t } = useI18n()
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

// Only the tools this user owns — same table component as Tool Management.
const { authHeaders } = useAuth()
const { data } = await useFetch<AdminToolsResponse>('/api/me/tools', {
  headers: () => authHeaders(),
  watch: false
})
const items = computed(() => data.value?.items ?? [])

useSeoMeta({
  title: () => `${t('myAIsPage.title')} — TopAICollection`
})
</script>

<template>
  <div>
    <h1 class="text-xl font-extrabold text-ink-900">{{ t('myAIsPage.title') }}</h1>

    <div class="mt-4 flex flex-wrap gap-3">
      <NuxtLinkLocale to="/submit" class="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
        {{ t('myAIsPage.submitNewAI') }}
      </NuxtLinkLocale>
      <NuxtLinkLocale to="/update-ai" class="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
        {{ t('myAIsPage.updateNewAI') }}
      </NuxtLinkLocale>
    </div>

    <ToolsTable class="mt-5" :tools="items" />
  </div>
</template>
