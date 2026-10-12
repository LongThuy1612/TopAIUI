<script setup lang="ts">
import type { AdminAdCampaign, AdCampaignStatus } from '~/types'

const { t, locale } = useI18n()
definePageMeta({ layout: 'dashboard', middleware: ['auth', 'admin'] })
const { authHeaders } = useAuth()

// "review": new campaigns and landing URL changes waiting for a decision — the inbox.
const filter = ref<'review' | 'all'>('review')

const { data, refresh } = await useFetch<{ items: AdminAdCampaign[] }>('/api/admin/ads', {
  query: computed(() => ({ filter: filter.value })),
  headers: () => authHeaders(),
  watch: [filter]
})
const items = computed(() => data.value?.items ?? [])

const busyId = ref<string | null>(null)
const actionError = ref('')

type Action = { action: 'pause' | 'resume' }
  | { action: 'approve'; seen: { landingUrl: string | null; pendingLandingUrl: string | null } } | { action: 'reject'; reason: string } | { action: 'addClicks'; clicks: number }

async function act(c: AdminAdCampaign, body: Action) {
  busyId.value = c.id
  actionError.value = ''
  try {
    await $fetch(`/api/admin/ads/${c.id}`, { method: 'POST', headers: authHeaders(), body })
    await refresh()
  } catch (e: any) {
    actionError.value = e?.data?.message || t('admin.saveError')
  } finally {
    busyId.value = null
  }
}

function reject(c: AdminAdCampaign) {
  // A campaign that never ran is refunded; a URL change is just dropped.
  const reason = prompt(t(c.status === 'PENDING_REVIEW' ? 'adminAds.rejectCampaignPrompt' : 'adminAds.rejectLandingPrompt'))?.trim()
  if (reason) act(c, { action: 'reject', reason })
}

function addClicks(c: AdminAdCampaign) {
  const clicks = Number(prompt(t('adminAds.addClicksPrompt')))
  if (Number.isInteger(clicks) && clicks > 0) act(c, { action: 'addClicks', clicks })
}

const statusClass: Record<AdCampaignStatus, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  PENDING_REVIEW: 'bg-amber-50 text-amber-700',
  PAUSED: 'bg-ink-100 text-ink-600',
  EXHAUSTED: 'bg-sky-50 text-sky-700',
  REJECTED: 'bg-red-50 text-red-600'
}
const nf = computed(() => new Intl.NumberFormat(locale.value))
const formatDate = (d: string) => new Date(d).toLocaleString(locale.value, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
const awaitingReview = (c: AdminAdCampaign) => c.status === 'PENDING_REVIEW' || !!c.pendingLandingUrl

useSeoMeta({ title: () => `${t('adminAds.title')} — TopAICollection` })
</script>

<template>
  <div>
    <h1 class="flex items-center gap-2 text-xl font-extrabold text-ink-900">
      <span>📣</span> {{ t('adminAds.title') }}
    </h1>

    <div class="mt-5 flex flex-wrap items-center gap-2">
      <button
        v-for="f in (['review', 'all'] as const)"
        :key="f"
        type="button"
        :class="['rounded-full border px-3 py-1.5 text-sm font-semibold transition', filter === f ? 'border-brand-500 bg-brand-500 text-white' : 'border-ink-200 text-ink-600 hover:border-brand-300']"
        @click="filter = f"
      >
        {{ t(`adminAds.filters.${f}`) }}
      </button>
    </div>

    <p v-if="actionError" class="mt-3 text-sm text-red-600">{{ actionError }}</p>

    <div class="mt-4 overflow-x-auto rounded-xl border border-ink-100">
      <table class="w-full min-w-[1000px] text-left text-sm">
        <thead class="bg-ink-100/40 text-xs uppercase tracking-wide text-ink-400">
          <tr>
            <th class="px-4 py-3">{{ t('adminAds.colCampaign') }}</th>
            <th class="px-4 py-3">{{ t('adminAds.colLanding') }}</th>
            <th class="px-4 py-3">{{ t('adminAds.colBalance') }}</th>
            <th class="px-4 py-3">{{ t('adminAds.colStatus') }}</th>
            <th class="px-4 py-3 text-right">{{ t('adminAds.colActions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in items" :key="c.id" class="border-t border-ink-100 align-top">
            <td class="w-[240px] px-4 py-3">
              <div class="flex items-center gap-2">
                <NuxtLink :to="`/tools/${c.tool.slug}`" target="_blank" class="font-semibold text-ink-900 hover:text-brand-600">{{ c.tool.name }}</NuxtLink>
                <span :class="['rounded-full px-2 py-0.5 text-[11px] font-semibold', c.tier === 'FEATURED' ? 'bg-brand-500 text-white' : 'bg-ink-100 text-ink-600']">
                  {{ t(`advertisePage.tiers.${c.tier}`) }}
                </span>
              </div>
              <span class="block break-all text-xs text-ink-500">{{ c.user.email }}</span>
              <span class="mt-1 block text-xs text-ink-400">{{ formatDate(c.updatedAt) }}</span>
            </td>
            <td class="max-w-[360px] px-4 py-3 text-xs">
              <div class="text-ink-400">{{ t('adminAds.toolWebsite') }}</div>
              <a v-if="c.tool.website" :href="c.tool.website" target="_blank" rel="noopener noreferrer nofollow" class="block truncate text-ink-700 hover:text-brand-600">{{ c.tool.website }}</a>
              <div class="mt-1.5 text-ink-400">{{ t('adminAds.landing') }}</div>
              <a v-if="c.landingUrl" :href="c.landingUrl" target="_blank" rel="noopener noreferrer nofollow" class="block truncate text-brand-600 hover:text-brand-700">{{ c.landingUrl }}</a>
              <span v-else class="text-ink-500">{{ t('adminAds.sameAsWebsite') }}</span>
              <template v-if="c.pendingLandingUrl">
                <div class="mt-1.5 font-semibold text-amber-700">{{ t('adminAds.pendingLanding') }}</div>
                <a :href="c.pendingLandingUrl" target="_blank" rel="noopener noreferrer nofollow" class="block truncate text-amber-700 hover:underline">{{ c.pendingLandingUrl }}</a>
              </template>
            </td>
            <td class="whitespace-nowrap px-4 py-3 text-ink-700">
              <div><b>{{ nf.format(c.clicksRemaining) }}</b> / {{ nf.format(c.clicksPurchased) }}</div>
              <div class="text-xs text-ink-500">{{ t('advertisePage.impressions') }}: {{ nf.format(c.impressions) }} · {{ t('advertisePage.clicks') }}: {{ nf.format(c.clicks) }}</div>
            </td>
            <td class="w-[180px] px-4 py-3">
              <span :class="['whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold', statusClass[c.status]]">{{ t(`advertisePage.statuses.${c.status}`) }}</span>
              <p v-if="c.pausedByAdmin" class="mt-1 text-xs text-ink-500">{{ t('advertisePage.pausedByAdmin') }}</p>
              <p v-if="c.rejectionReason" class="mt-1 text-xs text-red-600">{{ c.rejectionReason }}</p>
            </td>
            <td class="whitespace-nowrap px-4 py-3 text-right">
              <div class="flex flex-col items-end gap-1.5 text-sm font-semibold">
                <template v-if="awaitingReview(c)">
                  <button type="button" :disabled="busyId === c.id" class="text-emerald-600 hover:text-emerald-700 disabled:opacity-50" @click="act(c, { action: 'approve', seen: { landingUrl: c.landingUrl, pendingLandingUrl: c.pendingLandingUrl } })">
                    {{ t(c.status === 'PENDING_REVIEW' ? 'adminAds.approveCampaign' : 'adminAds.approveLanding') }}
                  </button>
                  <button type="button" :disabled="busyId === c.id" class="text-red-500 hover:text-red-600 disabled:opacity-50" @click="reject(c)">
                    {{ t(c.status === 'PENDING_REVIEW' ? 'adminAds.rejectCampaign' : 'adminAds.rejectLanding') }}
                  </button>
                </template>
                <button
                  v-if="c.status === 'ACTIVE' || c.status === 'EXHAUSTED' || (c.status === 'PAUSED' && !c.pausedByAdmin)"
                  type="button"
                  :disabled="busyId === c.id"
                  class="text-ink-700 hover:text-brand-600 disabled:opacity-50"
                  @click="act(c, { action: 'pause' })"
                >{{ t('advertisePage.pause') }}</button>
                <button
                  v-else-if="c.status === 'PAUSED'"
                  type="button"
                  :disabled="busyId === c.id"
                  class="text-ink-700 hover:text-brand-600 disabled:opacity-50"
                  @click="act(c, { action: 'resume' })"
                >{{ t('advertisePage.resume') }}</button>
                <button
                  v-if="c.status !== 'REJECTED'"
                  type="button"
                  :disabled="busyId === c.id"
                  class="text-ink-700 hover:text-brand-600 disabled:opacity-50"
                  @click="addClicks(c)"
                >{{ t('adminAds.addClicks') }}</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!items.length" class="py-12 text-center text-sm text-ink-400">{{ t(filter === 'review' ? 'adminAds.emptyReview' : 'adminAds.empty') }}</p>
    </div>
  </div>
</template>
