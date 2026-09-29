<script setup lang="ts">
import type { AdminUser, AdminUsersResponse, UserRole } from '~/types'

const { t } = useI18n()
definePageMeta({ layout: 'dashboard', middleware: ['auth', 'admin'] })
const { user: me, authHeaders } = useAuth()

const searchQuery = ref('')
const roleFilter = ref<'' | UserRole>('')

const { data, refresh } = await useFetch<AdminUsersResponse>('/api/admin/users', {
  query: computed(() => ({ q: searchQuery.value || undefined, role: roleFilter.value || undefined })),
  headers: authHeaders(),
  watch: [searchQuery, roleFilter]
})
const items = computed(() => data.value?.items ?? [])

const roleClass: Record<UserRole, string> = {
  ADMIN: 'bg-brand-50 text-brand-600',
  MANAGER: 'bg-blue-50 text-blue-600',
  USER: 'bg-ink-100 text-ink-600'
}

const deleteError = ref('')
async function remove(u: AdminUser) {
  if (!confirm(t('admin.users.deleteConfirm', { email: u.email }))) return
  deleteError.value = ''
  try {
    await $fetch(`/api/admin/users/${u.id}`, { method: 'DELETE', headers: authHeaders() })
    await refresh()
  } catch (e: any) {
    deleteError.value = e?.data?.message || t('admin.saveError')
  }
}

const formatDate = (d: string) => new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })

useSeoMeta({ title: () => `${t('admin.users.title')} — TopAICollection` })
</script>

<template>
  <div>
    <div class="flex flex-wrap items-start justify-between gap-3">
      <h1 class="flex items-center gap-2 text-xl font-extrabold text-ink-900">
        <span>👥</span> {{ t('admin.users.title') }}
      </h1>
      <NuxtLink to="/admin/users/new" class="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14m-7-7h14" />
        </svg>
        {{ t('admin.users.newUser') }}
      </NuxtLink>
    </div>

    <div class="mt-5 flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-ink-500">{{ t('admin.users.total', { n: data?.total ?? 0 }) }}</p>
      <div class="flex w-full flex-wrap gap-2 sm:w-auto">
        <select v-model="roleFilter" class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400">
          <option value="">{{ t('admin.users.roleAll') }}</option>
          <option v-for="r in (['USER', 'MANAGER', 'ADMIN'] as const)" :key="r" :value="r">{{ t(`admin.users.roles.${r}`) }}</option>
        </select>
        <div class="w-full sm:w-64">
          <SearchBar v-model="searchQuery" :placeholder="t('admin.users.searchPlaceholder')" dense />
        </div>
      </div>
    </div>

    <p v-if="deleteError" class="mt-3 text-sm text-red-600">{{ deleteError }}</p>

    <div class="mt-4 overflow-x-auto rounded-xl border border-ink-100">
      <table class="w-full min-w-[760px] text-left text-sm">
        <thead class="bg-ink-100/40 text-xs uppercase tracking-wide text-ink-400">
          <tr>
            <th class="px-4 py-3">{{ t('admin.users.colUser') }}</th>
            <th class="px-4 py-3">{{ t('admin.users.colRole') }}</th>
            <th class="px-4 py-3">{{ t('admin.users.colStatus') }}</th>
            <th class="px-4 py-3">{{ t('admin.users.colOrders') }}</th>
            <th class="px-4 py-3">{{ t('admin.users.colCreated') }}</th>
            <th class="px-4 py-3 text-right">{{ t('admin.users.colActions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in items" :key="u.id" class="border-t border-ink-100">
            <td class="px-4 py-3">
              <NuxtLink :to="`/admin/users/${u.id}`" class="block hover:opacity-80">
                <span class="font-semibold text-ink-900">{{ u.name || '—' }}</span>
                <span v-if="u.id === me?.id" class="ml-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">{{ t('admin.users.you') }}</span>
                <span class="block text-xs text-ink-500">{{ u.email }}</span>
              </NuxtLink>
            </td>
            <td class="px-4 py-3">
              <span :class="['rounded-full px-2.5 py-0.5 text-xs font-semibold', roleClass[u.role]]">{{ t(`admin.users.roles.${u.role}`) }}</span>
            </td>
            <td class="px-4 py-3">
              <span :class="['rounded-full px-2.5 py-0.5 text-xs font-semibold', u.isBanned ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700']">
                {{ u.isBanned ? t('admin.users.banned') : t('admin.users.active') }}
              </span>
            </td>
            <td class="px-4 py-3 text-ink-600">{{ u._count.promoteOrders }}</td>
            <td class="px-4 py-3 text-ink-500">{{ formatDate(u.createdAt) }}</td>
            <td class="px-4 py-3 text-right">
              <NuxtLink :to="`/admin/users/${u.id}`" class="text-sm font-semibold text-brand-600 hover:text-brand-700">{{ t('admin.users.edit') }}</NuxtLink>
              <button
                v-if="u.id !== me?.id"
                type="button"
                class="ml-4 text-sm font-semibold text-red-500 hover:text-red-600"
                @click="remove(u)"
              >
                {{ t('admin.users.delete') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!items.length" class="py-12 text-center text-sm text-ink-400">{{ t('admin.users.empty') }}</p>
    </div>
  </div>
</template>
