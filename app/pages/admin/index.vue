<script setup lang="ts">
import type { AdminToolsResponse } from '~/types'

const { token, load, authHeaders, logout } = useAdminAuth()
load()

if (import.meta.client && !token.value) {
  await navigateTo('/admin/login')
}

const statusFilter = ref<'all' | 'PENDING' | 'PUBLISHED'>('all')
const { data, refresh, error } = await useFetch<AdminToolsResponse>('/api/admin/tools', {
  query: computed(() => (statusFilter.value === 'all' ? {} : { status: statusFilter.value })),
  headers: authHeaders(),
  watch: false
})

if (error.value?.statusCode === 401) {
  logout()
  await navigateTo('/admin/login')
}

const items = computed(() => data.value?.items ?? [])

async function approve(id: string) {
  await $fetch(`/api/admin/tools/${id}`, { method: 'PATCH', headers: authHeaders(), body: { status: 'PUBLISHED' } })
  refresh()
}

async function unpublish(id: string) {
  await $fetch(`/api/admin/tools/${id}`, { method: 'PATCH', headers: authHeaders(), body: { status: 'PENDING' } })
  refresh()
}

async function toggleFeatured(id: string, isFeatured: boolean) {
  await $fetch(`/api/admin/tools/${id}`, { method: 'PATCH', headers: authHeaders(), body: { isFeatured: !isFeatured } })
  refresh()
}

async function remove(id: string) {
  if (!confirm('Delete this tool permanently?')) return
  await $fetch(`/api/admin/tools/${id}`, { method: 'DELETE', headers: authHeaders() })
  refresh()
}

useSeoMeta({ title: 'Admin — Topainew' })
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-extrabold text-ink-900">Admin — Tools</h1>
      <button class="text-sm font-medium text-ink-600 hover:text-brand-600" @click="logout(); navigateTo('/admin/login')">Log out</button>
    </div>

    <div class="mt-4 flex gap-2">
      <button
        v-for="s in (['all', 'PENDING', 'PUBLISHED'] as const)"
        :key="s"
        :class="['rounded-full border px-3 py-1.5 text-xs font-semibold', statusFilter === s ? 'border-brand-500 bg-brand-500 text-white' : 'border-ink-200 text-ink-600']"
        @click="statusFilter = s"
      >
        {{ s }}
      </button>
    </div>

    <table class="mt-6 w-full text-left text-sm">
      <thead class="text-xs uppercase text-ink-400">
        <tr>
          <th class="py-2">Name</th>
          <th class="py-2">Category</th>
          <th class="py-2">Status</th>
          <th class="py-2">Featured</th>
          <th class="py-2">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="tool in items" :key="tool.id" class="border-t border-ink-100">
          <td class="py-3 font-medium text-ink-900">{{ tool.name }}</td>
          <td class="py-3 text-ink-600">{{ tool.categories?.map(c => c.name).join(', ') || '—' }}</td>
          <td class="py-3">
            <span :class="['rounded-full px-2 py-0.5 text-[11px] font-semibold', tool.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700']">
              {{ tool.status }}
            </span>
          </td>
          <td class="py-3">
            <button class="text-xs font-semibold text-brand-600" @click="toggleFeatured(tool.id, tool.isFeatured)">
              {{ tool.isFeatured ? 'Yes — unfeature' : 'No — feature' }}
            </button>
          </td>
          <td class="py-3 space-x-3">
            <button v-if="tool.status === 'PENDING'" class="text-xs font-semibold text-emerald-600" @click="approve(tool.id)">Approve</button>
            <button v-else class="text-xs font-semibold text-ink-500" @click="unpublish(tool.id)">Unpublish</button>
            <button class="text-xs font-semibold text-red-600" @click="remove(tool.id)">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>

    <p v-if="!items.length" class="mt-10 text-center text-sm text-ink-400">No tools match this filter.</p>
  </div>
</template>
