<script setup lang="ts">
import type { Category } from '~/types'

const { t } = useI18n()
const router = useRouter()
const localePath = useLocalePath()

definePageMeta({ layout: 'dashboard', middleware: ['auth', 'admin'] })
const { authHeaders } = useAuth()

const { data: categories } = await useFetch<Category[]>('/api/categories')


function goBack() {
  router.push(localePath('/admin/tools'))
}

function onSaved(id: string) {
  router.push(localePath(`/admin/tools/${id}`))
}

useSeoMeta({ title: 'New Tool — TopAICollection' })
</script>

<template>
  <div>
    <button type="button" class="flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-brand-600" @click="goBack">
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      {{ t('admin.backToList') }}
    </button>

    <h1 class="mt-3 text-xl font-extrabold text-ink-900">{{ t('admin.newToolTitle') }}</h1>
    <p class="mt-1 text-sm text-ink-500">{{ t('admin.newToolSubtitle') }}</p>

    <ToolForm
      class="mt-6"
      mode="create"
      :initial-tool="null"
      :categories="categories ?? []"
      @saved="onSaved"
      @cancel="goBack"
    />
  </div>
</template>
