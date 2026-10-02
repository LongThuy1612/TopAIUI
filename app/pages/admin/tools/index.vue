<script setup lang="ts">
import type { AdminToolsResponse } from '~/types'

const { t } = useI18n()
definePageMeta({ layout: 'dashboard', middleware: ['auth', 'admin'] })
const { authHeaders } = useAuth()

const searchQuery = ref('')

const { data } = await useFetch<AdminToolsResponse>('/api/admin/tools', {
  query: computed(() => ({ isApproved: 'false', q: searchQuery.value || undefined })),
  headers: authHeaders(),
  watch: [searchQuery]
})


const items = computed(() => data.value?.items ?? [])

// Paid updates of published tools waiting for review — those tools are approved, so
// they don't show up in the list below.
const { data: updates } = await useFetch<{ items: { id: string; submittedAt: string; tool: { id: string; name: string }; user: { email: string } }[] }>('/api/admin/update-requests', {
  headers: authHeaders(),
  watch: false
})

useSeoMeta({ title: 'Quản lý Tool — TopAICollection' })
</script>

<template>
  <div>
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

    <section v-if="updates?.items.length" class="mt-5 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
      <h2 class="text-sm font-extrabold text-ink-900">{{ t('admin.update.pendingTitle', { n: updates.items.length }) }}</h2>
      <ul class="mt-2 divide-y divide-amber-100 text-sm">
        <li v-for="u in updates.items" :key="u.id" class="flex flex-wrap items-center justify-between gap-2 py-2">
          <NuxtLink :to="`/admin/tools/${u.tool.id}`" class="font-semibold text-brand-600 hover:underline">{{ u.tool.name }}</NuxtLink>
          <span class="text-ink-500">{{ u.user.email }} · {{ new Date(u.submittedAt).toLocaleString() }}</span>
        </li>
      </ul>
    </section>

    <ToolsTable class="mt-4" :tools="items" admin />
  </div>
</template>
