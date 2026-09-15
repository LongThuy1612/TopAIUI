<script setup lang="ts">
import type { Category } from '~/types'

const { t } = useI18n()
const router = useRouter()

const { token, load, authHeaders, logout } = useAdminAuth()
load()

if (import.meta.client && !token.value) {
  await navigateTo('/admin/login')
}

const { data: categories, error } = await useFetch<Category[]>('/api/categories')

if (error.value?.statusCode === 401) {
  logout()
  await navigateTo('/admin/login')
}

function goBack() {
  router.push('/admin/tools')
}

function onSaved(id: string) {
  router.push(`/admin/tools/${id}`)
}

useSeoMeta({ title: 'New Tool — TopAICollection' })
</script>

<template>
  <div class="flex min-h-[calc(100vh-64px)] w-full">
    <AdminSidebar />

    <div class="min-w-0 flex-1 px-6 py-6 lg:px-8">
      <button type="button" class="flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-brand-600" @click="goBack">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        {{ t('admin.backToList') }}
      </button>

      <h1 class="mt-3 text-xl font-extrabold text-ink-900">{{ t('admin.newToolTitle') }}</h1>
      <p class="mt-1 text-sm text-ink-500">{{ t('admin.newToolSubtitle') }}</p>

      <AdminToolForm
        class="mt-6"
        mode="create"
        :initial-tool="null"
        :categories="categories ?? []"
        @saved="onSaved"
        @cancel="goBack"
      />
    </div>
  </div>
</template>
