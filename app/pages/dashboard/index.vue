<script setup lang="ts">
import type { AdminToolsResponse } from '~/types'

const { t } = useI18n()
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

// The logged-in user's own tools (admins see the full list under Tool Management).
const { user, isAdmin, authHeaders } = useAuth()
// Greet the logged-in person, not a fixed "Admin".
const displayName = computed(() => user.value?.name || user.value?.email?.split('@')[0] || '')
const { data } = await useFetch<AdminToolsResponse>('/api/me/tools', {
  headers: () => authHeaders(),
  watch: false
})

// Tile counters: an admin gets the whole site's numbers and the tiles open the admin
// pages (the customer pages aren't in an admin's menu); a customer gets their own.
type Pair = Record<string, number>
const { data: stats } = await useFetch<{ tools: Pair; ads: Pair; posts: Pair; gpts: Pair }>('/api/dashboard/stats', { headers: () => authHeaders(), watch: false })
const n = (group: 'tools' | 'ads' | 'posts' | 'gpts', key: string) => stats.value?.[group]?.[key] ?? 0

const allItems = computed(() => data.value?.items ?? [])

const statusFilter = ref<'all' | 'PENDING' | 'PUBLISHED'>('all')
const items = computed(() => statusFilter.value === 'all' ? allItems.value : allItems.value.filter(t => t.status === statusFilter.value))
const statusLabels: Record<'all' | 'PENDING' | 'PUBLISHED', string> = {
  all: 'admin.statusAll',
  PENDING: 'admin.statusPending',
  PUBLISHED: 'admin.statusPublished'
}

const activeTab = ref<'data' | 'social'>('data')

const featureCards = computed(() => [
  { label: t('admin.websiteInsights'), to: '/dashboard/insights', color: 'bg-orange-50 text-orange-500', icon: 'M4 19h16M6 15l3-4 3 2 4-6 2 3' },
  { label: t('admin.socialListening'), to: '/dashboard/social-listening', color: 'bg-pink-50 text-pink-500', icon: 'M12 3a7 7 0 0 0-7 7c0 3.5 2 5.5 3 7l1 2h6l1-2c1-1.5 3-3.5 3-7a7 7 0 0 0-7-7Zm-2 18h4' },
  { label: t('admin.aiAdvertisingLibrary'), to: '#', color: 'bg-emerald-50 text-emerald-500', icon: 'M4 6h16v12H4V6Zm0 4h16', comingSoon: true }
])

useSeoMeta({ title: 'Dashboard — TopAICollection' })
</script>

<template>
  <div>
    <div>
      <h1 class="flex items-center gap-2 text-xl font-extrabold text-ink-900">
        <span>👋</span> {{ t('admin.greeting', { name: displayName }) }}
      </h1>
      <p class="mt-1 text-sm text-ink-500">{{ t('admin.greetingSubtitle') }}</p>
    </div>

    <div class="mt-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
      <NuxtLink
        v-for="card in featureCards"
        :key="card.label"
        :to="card.to"
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
      </NuxtLink>
    </div>

    <div class="mt-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
      <NuxtLink :to="isAdmin ? '/admin/tools' : '/dashboard/my-ais'" class="rounded-xl border border-ink-100 bg-white p-4 hover:border-brand-200">
        <div class="text-sm font-bold text-ink-900">{{ t('admin.myAIsData') }}</div>
        <div class="mt-2 text-xs text-ink-500">
          <span class="font-semibold text-amber-600">{{ n('tools', 'pending') }}</span> {{ t('admin.pending') }} ·
          <span class="font-semibold text-emerald-600">{{ n('tools', 'published') }}</span> {{ t('admin.published') }}
        </div>
      </NuxtLink>
      <NuxtLink :to="isAdmin ? '/admin/ads' : '/dashboard/advertise'" class="rounded-xl border border-ink-100 bg-white p-4 hover:border-brand-200">
        <div class="text-sm font-bold text-ink-900">{{ t('admin.advertise') }}</div>
        <div class="mt-2 text-xs text-ink-500">
          <span class="font-semibold text-emerald-600">{{ n('ads', 'running') }}</span> {{ t('admin.advertising') }} ·
          <span class="font-semibold text-ink-800">{{ n('ads', 'stopped') }}</span> {{ t('admin.stopped') }}
        </div>
      </NuxtLink>
      <NuxtLink :to="isAdmin ? '/admin/posts' : '/dashboard/my-posts'" class="rounded-xl border border-ink-100 bg-white p-4 hover:border-brand-200">
        <div class="text-sm font-bold text-ink-900">{{ t('admin.guestPosts') }}</div>
        <div class="mt-2 text-xs text-ink-500">
          <span class="font-semibold text-amber-600">{{ n('posts', 'pending') }}</span> {{ t('admin.pending') }} ·
          <span class="font-semibold text-emerald-600">{{ n('posts', 'published') }}</span> {{ t('admin.published') }}
        </div>
      </NuxtLink>
      <NuxtLink :to="isAdmin ? '/admin/gpts' : '/dashboard/my-gpts'" class="rounded-xl border border-ink-100 bg-white p-4 hover:border-brand-200">
        <div class="text-sm font-bold text-ink-900">{{ t('admin.submitGPTs') }}</div>
        <div class="mt-2 text-xs text-ink-500">
          <span class="font-semibold text-amber-600">{{ n('gpts', 'pending') }}</span> {{ t('admin.pending') }} ·
          <span class="font-semibold text-emerald-600">{{ n('gpts', 'published') }}</span> {{ t('admin.published') }}
        </div>
      </NuxtLink>
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

      <ToolsTable class="mt-4" :tools="items" />
    </template>

    <div v-else class="mt-10 rounded-xl border border-dashed border-ink-200 py-16 text-center text-sm text-ink-400">
      {{ t('admin.socialListeningComingSoon') }}
    </div>
  </div>
</template>
