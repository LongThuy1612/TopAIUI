<script setup lang="ts">
import type { AdminToolsResponse } from '~/types'

const { t } = useI18n()
const { token, load, authHeaders, logout } = useAdminAuth()
load()

if (import.meta.client && !token.value) {
  await navigateTo('/admin/login')
}

const searchQuery = ref('')

const { data, error } = await useFetch<AdminToolsResponse>('/api/admin/tools', {
  query: computed(() => ({ isApproved: 'false', q: searchQuery.value || undefined })),
  headers: authHeaders(),
  watch: [searchQuery]
})

if (error.value?.statusCode === 401) {
  logout()
  await navigateTo('/admin/login')
}

const items = computed(() => data.value?.items ?? [])

useSeoMeta({ title: 'Quản lý Tool — TopAICollection' })
</script>

<template>
  <div class="flex min-h-[calc(100vh-64px)] w-full">
    <AdminSidebar />

    <div class="min-w-0 flex-1 px-6 py-6 lg:px-8">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="flex items-center gap-2 text-xl font-extrabold text-ink-900">
            <span>🛠️</span> {{ t('admin.manageTools') }}
          </h1>
        </div>
        <NuxtLink to="/admin/tools/new" class="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14m-7-7h14" />
          </svg>
          {{ t('admin.newTool') }}
        </NuxtLink>
      </div>

      <div class="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm text-ink-500"><span class="font-semibold text-ink-800">{{ items.length }}</span> {{ t('admin.pendingCount', items.length) }}</p>

        <div class="w-full sm:w-64">
          <SearchBar v-model="searchQuery" :placeholder="t('admin.searchPlaceholder')" dense />
        </div>
      </div>

      <AdminToolsTable class="mt-4" :tools="items" />
    </div>
  </div>
</template>
