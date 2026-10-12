<script setup lang="ts">
import type { GptStatus, MyGpt } from '~/types'

const { t, locale } = useI18n()
definePageMeta({ layout: 'dashboard', middleware: 'auth' })
const { authHeaders } = useAuth()

// GPTs created from the user's paid Submit GPT orders (server/utils/gpts.ts).
const { data, pending, error } = await useFetch<{ items: MyGpt[] }>('/api/me/gpts', { headers: () => authHeaders() })
const gpts = computed(() => data.value?.items ?? [])

const statusClass: Record<GptStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700',
  PUBLISHED: 'bg-emerald-50 text-emerald-700',
  HIDDEN: 'bg-ink-100 text-ink-500',
  REJECTED: 'bg-red-50 text-red-600'
}
const date = (iso: string) => new Date(iso).toLocaleDateString(locale.value, { year: 'numeric', month: 'short', day: 'numeric' })
const initials = (name: string) => name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'G'

useSeoMeta({
  title: () => `${t('myGPTsPage.title')} — TopAICollection`
})
</script>

<template>
  <div>
    <h1 class="text-xl font-extrabold text-ink-900">{{ t('myGPTsPage.title') }}</h1>

    <div class="mt-4">
      <NuxtLinkLocale to="/submit-gpt" class="inline-block rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
        {{ t('myGPTsPage.submitNewGPT') }}
      </NuxtLinkLocale>
    </div>

    <div class="mt-5 overflow-x-auto rounded-xl border border-ink-100">
      <table class="w-full min-w-[600px] text-left text-sm">
        <thead class="bg-ink-100/40 text-xs font-bold uppercase tracking-wide text-ink-900">
          <tr>
            <th class="px-4 py-3">{{ t('myGPTsPage.colTool') }}</th>
            <th class="px-4 py-3">{{ t('myGPTsPage.colDate') }}</th>
            <th class="px-4 py-3">{{ t('myGPTsPage.colStatus') }}</th>
          </tr>
        </thead>
        <tbody v-if="gpts.length" class="divide-y divide-ink-100">
          <tr v-for="g in gpts" :key="g.id" class="align-top">
            <td class="max-w-[380px] px-4 py-3">
              <div class="flex items-center gap-3">
                <img v-if="g.iconUrl" :src="g.iconUrl" alt="" class="h-9 w-9 shrink-0 rounded-full object-cover">
                <span v-else class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-extrabold text-brand-500">{{ initials(g.name) }}</span>
                <div class="min-w-0">
                  <div class="truncate font-semibold text-ink-900">{{ g.name || (g.fetchStatus === 'QUEUED' ? t('myGPTsPage.fetching') : 'GPT') }}</div>
                  <a :href="g.url" target="_blank" rel="noopener noreferrer nofollow" class="block truncate text-xs text-ink-500 hover:text-brand-600">{{ g.url }}</a>
                </div>
              </div>
            </td>
            <td class="whitespace-nowrap px-4 py-3 text-ink-600">{{ date(g.publishedAt ?? g.createdAt) }}</td>
            <td class="w-[260px] px-4 py-3">
              <span :class="['whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold', statusClass[g.status]]">{{ t(`myGPTsPage.statuses.${g.status}`) }}</span>
              <NuxtLinkLocale v-if="g.status === 'PUBLISHED'" :to="`/gpts/${g.slug}`" target="_blank" class="mt-1 block text-xs font-semibold text-brand-600 hover:underline">{{ t('myGPTsPage.viewListing') }} ↗</NuxtLinkLocale>
              <p v-if="g.status === 'PENDING'" class="mt-1 text-xs text-ink-500">{{ t('myGPTsPage.pendingHint') }}</p>
              <p v-if="g.status === 'REJECTED'" class="mt-1 whitespace-pre-line text-xs text-ink-600">
                <template v-if="g.rejectionReason"><b>{{ t('myTool.reason') }}:</b> {{ g.rejectionReason }}<br></template>{{ t('myGPTsPage.refundedHint') }}
              </p>
            </td>
          </tr>
        </tbody>
      </table>

      <p v-if="error" class="py-16 text-center text-sm text-red-600">{{ t('websiteInsights.loadError') }}</p>
      <p v-else-if="pending && !gpts.length" class="py-16 text-center text-sm text-ink-400">{{ t('promote.orders.loading') }}</p>
      <div v-else-if="!gpts.length" class="flex flex-col items-center gap-4 py-16">
        <p class="text-sm text-ink-900">{{ t('myGPTsPage.emptyMessage') }}</p>
        <NuxtLinkLocale to="/submit-gpt" class="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
          {{ t('myGPTsPage.submitYourGPT') }}
        </NuxtLinkLocale>
      </div>
    </div>
  </div>
</template>
