<script setup lang="ts">
import type { AdminToolsResponse } from '~/types'

const { t } = useI18n()
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

// The logged-in user's own tools — customers only: admins manage every tool under Tool
// Management, and their tiles above count the whole site.
const { user, isAdmin, authHeaders } = useAuth()
// Greet the logged-in person, not a fixed "Admin".
const displayName = computed(() => user.value?.name || user.value?.email?.split('@')[0] || '')
const { data } = await useFetch<AdminToolsResponse>('/api/me/tools', {
  headers: () => authHeaders(),
  immediate: !isAdmin.value,
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
      <NuxtLinkLocale :to="isAdmin ? '/admin/tools' : '/dashboard/my-ais'" class="rounded-xl border border-ink-100 bg-white p-4 hover:border-brand-200">
        <div class="text-sm font-bold text-ink-900">{{ t('admin.myAIsData') }}</div>
        <div class="mt-2 text-xs text-ink-500">
          <span class="font-semibold text-amber-600">{{ n('tools', 'pending') }}</span> {{ t('admin.pending') }} ·
          <span class="font-semibold text-emerald-600">{{ n('tools', 'published') }}</span> {{ t('admin.published') }}
        </div>
      </NuxtLinkLocale>
      <NuxtLinkLocale :to="isAdmin ? '/admin/ads' : '/dashboard/advertise'" class="rounded-xl border border-ink-100 bg-white p-4 hover:border-brand-200">
        <div class="text-sm font-bold text-ink-900">{{ t('admin.advertise') }}</div>
        <div class="mt-2 text-xs text-ink-500">
          <span class="font-semibold text-emerald-600">{{ n('ads', 'running') }}</span> {{ t('admin.advertising') }} ·
          <span class="font-semibold text-ink-800">{{ n('ads', 'stopped') }}</span> {{ t('admin.stopped') }}
        </div>
      </NuxtLinkLocale>
      <NuxtLinkLocale :to="isAdmin ? '/admin/posts' : '/dashboard/my-posts'" class="rounded-xl border border-ink-100 bg-white p-4 hover:border-brand-200">
        <div class="text-sm font-bold text-ink-900">{{ t('admin.guestPosts') }}</div>
        <div class="mt-2 text-xs text-ink-500">
          <span class="font-semibold text-amber-600">{{ n('posts', 'pending') }}</span> {{ t('admin.pending') }} ·
          <span class="font-semibold text-emerald-600">{{ n('posts', 'published') }}</span> {{ t('admin.published') }}
        </div>
      </NuxtLinkLocale>
      <NuxtLinkLocale :to="isAdmin ? '/admin/gpts' : '/dashboard/my-gpts'" class="rounded-xl border border-ink-100 bg-white p-4 hover:border-brand-200">
        <div class="text-sm font-bold text-ink-900">{{ t('admin.submitGPTs') }}</div>
        <div class="mt-2 text-xs text-ink-500">
          <span class="font-semibold text-amber-600">{{ n('gpts', 'pending') }}</span> {{ t('admin.pending') }} ·
          <span class="font-semibold text-emerald-600">{{ n('gpts', 'published') }}</span> {{ t('admin.published') }}
        </div>
      </NuxtLinkLocale>
    </div>

    <template v-if="!isAdmin">
    <div class="mt-8 flex flex-wrap items-center justify-between gap-3">
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
  </div>
</template>
