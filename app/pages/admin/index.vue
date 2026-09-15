<script setup lang="ts">
import type { AdminToolsResponse } from '~/types'

const { t } = useI18n()
const { token, load, authHeaders, logout } = useAdminAuth()
load()

if (import.meta.client && !token.value) {
  await navigateTo('/admin/login')
}

const { data, error } = await useFetch<AdminToolsResponse>('/api/admin/tools', {
  headers: authHeaders(),
  watch: false
})

if (error.value?.statusCode === 401) {
  logout()
  await navigateTo('/admin/login')
}

const allItems = computed(() => data.value?.items ?? [])
const pendingCount = computed(() => allItems.value.filter(t => t.status === 'PENDING').length)
const publishedCount = computed(() => allItems.value.filter(t => t.status === 'PUBLISHED').length)
const advertisingCount = computed(() => allItems.value.filter(t => t.isAd).length)

const statusFilter = ref<'all' | 'PENDING' | 'PUBLISHED'>('all')
const items = computed(() => statusFilter.value === 'all' ? allItems.value : allItems.value.filter(t => t.status === statusFilter.value))
const statusLabels: Record<'all' | 'PENDING' | 'PUBLISHED', string> = {
  all: 'admin.statusAll',
  PENDING: 'admin.statusPending',
  PUBLISHED: 'admin.statusPublished'
}

const activeTab = ref<'data' | 'social'>('data')

const featureCards = computed(() => [
  { label: t('admin.websiteInsights'), color: 'bg-orange-50 text-orange-500', icon: 'M4 19h16M6 15l3-4 3 2 4-6 2 3' },
  { label: t('admin.socialListening'), color: 'bg-pink-50 text-pink-500', icon: 'M12 3a7 7 0 0 0-7 7c0 3.5 2 5.5 3 7l1 2h6l1-2c1-1.5 3-3.5 3-7a7 7 0 0 0-7-7Zm-2 18h4' },
  { label: t('admin.researchReport'), color: 'bg-blue-50 text-blue-500', icon: 'M6 3h9l4 4v14H6V3Zm8 9H9m6 4H9' },
  { label: t('admin.aiAdvertisingLibrary'), color: 'bg-emerald-50 text-emerald-500', icon: 'M4 6h16v12H4V6Zm0 4h16', comingSoon: true }
])

useSeoMeta({ title: 'Admin — TopAICollection' })
</script>

<template>
  <div class="flex min-h-[calc(100vh-64px)] w-full">
    <AdminSidebar />

    <div class="min-w-0 flex-1 px-6 py-6 lg:px-8">
      <div>
        <h1 class="flex items-center gap-2 text-xl font-extrabold text-ink-900">
          <span>👋</span> {{ t('admin.greeting') }}
        </h1>
        <p class="mt-1 text-sm text-ink-500">{{ t('admin.greetingSubtitle') }}</p>
      </div>

      <div class="mt-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <a
          v-for="card in featureCards"
          :key="card.label"
          href="#"
          class="relative flex items-center justify-between rounded-xl border border-ink-100 bg-white p-4 transition hover:border-brand-200"
        >
          <div>
            <div class="text-sm font-bold text-ink-900">{{ card.label }}</div>
            <span v-if="card.comingSoon" class="mt-1.5 inline-block rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-500">{{ t('admin.comingSoon') }}</span>
          </div>
          <span :class="['flex h-10 w-10 shrink-0 items-center justify-center rounded-full', card.color]">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" :d="card.icon" />
            </svg>
          </span>
        </a>
      </div>

      <div class="mt-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-xl border border-ink-100 bg-white p-4">
          <div class="text-sm font-bold text-ink-900">{{ t('admin.myAIsData') }}</div>
          <div class="mt-2 text-xs text-ink-500">
            <span class="font-semibold text-amber-600">{{ pendingCount }}</span> {{ t('admin.pending') }} ·
            <span class="font-semibold text-emerald-600">{{ publishedCount }}</span> {{ t('admin.published') }}
          </div>
        </div>
        <div class="rounded-xl border border-ink-100 bg-white p-4">
          <div class="text-sm font-bold text-ink-900">{{ t('admin.advertise') }}</div>
          <div class="mt-2 text-xs text-ink-500">
            <span class="font-semibold text-ink-800">{{ advertisingCount }}</span> {{ t('admin.advertising') }} · 0 {{ t('admin.stopped') }}
          </div>
        </div>
        <div class="rounded-xl border border-ink-100 bg-white p-4 opacity-60">
          <div class="text-sm font-bold text-ink-900">{{ t('admin.guestPosts') }}</div>
          <div class="mt-2 text-xs text-ink-400">{{ t('admin.pendingProcessedPlaceholder') }}</div>
        </div>
        <div class="rounded-xl border border-ink-100 bg-white p-4 opacity-60">
          <div class="text-sm font-bold text-ink-900">{{ t('admin.submitGPTs') }}</div>
          <div class="mt-2 text-xs text-ink-400">{{ t('admin.pendingProcessedPlaceholder') }}</div>
        </div>
      </div>

      <div class="mt-6 flex items-center gap-5 border-b border-ink-100 text-sm font-semibold">
        <button
          type="button"
          :class="['border-b-2 pb-2.5', activeTab === 'data' ? 'border-brand-500 text-brand-600' : 'border-transparent text-ink-400 hover:text-ink-600']"
          @click="activeTab = 'data'"
        >
          {{ t('admin.myAIsData') }}
        </button>
        <button
          type="button"
          :class="['border-b-2 pb-2.5', activeTab === 'social' ? 'border-brand-500 text-brand-600' : 'border-transparent text-ink-400 hover:text-ink-600']"
          @click="activeTab = 'social'"
        >
          {{ t('admin.socialListening') }}
        </button>
      </div>

      <template v-if="activeTab === 'data'">
        <div class="mt-5 flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-lg font-extrabold text-ink-900">{{ t('admin.aiDataHeading') }}</h2>
          <div class="flex gap-2">
            <button
              v-for="s in (['all', 'PENDING', 'PUBLISHED'] as const)"
              :key="s"
              :class="['rounded-full border px-3 py-1.5 text-xs font-semibold', statusFilter === s ? 'border-brand-500 bg-brand-500 text-white' : 'border-ink-200 text-ink-600']"
              @click="statusFilter = s"
            >
              {{ t(statusLabels[s]) }}
            </button>
          </div>
        </div>

        <AdminToolsTable class="mt-4" :tools="items" />
      </template>

      <div v-else class="mt-10 rounded-xl border border-dashed border-ink-200 py-16 text-center text-sm text-ink-400">
        {{ t('admin.socialListeningComingSoon') }}
      </div>
    </div>
  </div>
</template>
