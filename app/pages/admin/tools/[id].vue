<script setup lang="ts">
import type { Category, Tool } from '~/types'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const toolId = String(route.params.id)

definePageMeta({ layout: 'dashboard', middleware: ['auth', 'admin'] })
const { authHeaders } = useAuth()

const { data: tool } = await useFetch<Tool>(`/api/admin/tools/${toolId}`, {
  headers: authHeaders(),
  watch: false
})


const { data: categories } = await useFetch<Category[]>('/api/categories')

function goBack() {
  router.back()
}

useSeoMeta({ title: 'Tool Details — TopAICollection' })
</script>

<template>
  <div>
    <button type="button" class="flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-brand-600" @click="goBack">
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      {{ t('admin.backToList') }}
    </button>

    <div v-if="!tool" class="mt-10 text-sm text-ink-400">{{ t('admin.loadError') }}</div>

    <template v-else>
      <h1 class="mt-3 text-xl font-extrabold text-ink-900">{{ t('admin.toolDetailTitle') }}</h1>
      <p class="mt-1 text-sm text-ink-500">{{ tool.slug }}</p>

      <ToolForm
        class="mt-6"
        mode="edit"
        :tool-id="toolId"
        :initial-tool="tool"
        :categories="categories ?? []"
        @saved="goBack"
        @cancel="goBack"
      />
    </template>
  </div>
</template>
