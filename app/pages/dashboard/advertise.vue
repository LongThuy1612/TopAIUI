<script setup lang="ts">
import type { AdCampaign, AdCampaignStatus } from '~/types'
import { isHttpUrl } from '~/composables/usePromoteCheckout'

const { t, locale } = useI18n()
definePageMeta({ layout: 'dashboard', middleware: 'auth' })
const { authHeaders } = useAuth()

// One campaign per tool and ad type; buying more clicks tops it up (server/utils/ads.ts).
const { data, pending, error, refresh } = await useFetch<{ items: AdCampaign[] }>('/api/me/ads', {
  headers: authHeaders()
})
const campaigns = computed(() => data.value?.items ?? [])
const adClicks = computed(() => campaigns.value.filter(c => c.status !== 'REJECTED').reduce((sum, c) => sum + c.clicksRemaining, 0))

const nf = computed(() => new Intl.NumberFormat(locale.value))
const pct = computed(() => new Intl.NumberFormat(locale.value, { style: 'percent', maximumFractionDigits: 2 }))
const date = (iso: string) => new Date(iso).toLocaleDateString(locale.value, { year: 'numeric', month: 'short', day: 'numeric' })
const ctr = (c: AdCampaign) => (c.impressions ? pct.value.format(c.clicks / c.impressions) : '—')

const statusClass: Record<AdCampaignStatus, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  PENDING_REVIEW: 'bg-amber-50 text-amber-700',
  PAUSED: 'bg-ink-100 text-ink-600',
  EXHAUSTED: 'bg-sky-50 text-sky-700',
  REJECTED: 'bg-red-50 text-red-600'
}

const busyId = ref<string | null>(null)
const actionError = ref('')
// Landing URL being edited: campaign id → draft.
const editing = ref<{ id: string; url: string } | null>(null)

async function patch(c: AdCampaign, body: { landingUrl?: string | null; paused?: boolean }) {
  busyId.value = c.id
  actionError.value = ''
  try {
    await $fetch(`/api/me/ads/${c.id}`, { method: 'PATCH', headers: authHeaders(), body })
    editing.value = null
    await refresh()
  } catch (e: any) {
    actionError.value = e?.data?.message || t('admin.saveError')
  } finally {
    busyId.value = null
  }
}

function saveLanding(c: AdCampaign) {
  const url = editing.value?.url.trim() ?? ''
  if (url && !isHttpUrl(url)) {
    actionError.value = t('promote.form.invalidUrl')
    return
  }
  patch(c, { landingUrl: url || null })
}

useSeoMeta({
  title: () => `${t('advertisePage.title')} — TopAICollection`
})
</script>

<template>
  <div>
    <h1 class="text-xl font-extrabold text-ink-900">{{ t('advertisePage.title') }}</h1>

    <div class="mt-4 flex flex-wrap items-center gap-4">
      <NuxtLink to="/advertise" class="inline-block rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
        {{ t('advertisePage.createNew') }}
      </NuxtLink>
      <p class="text-sm text-ink-900">
        {{ t('promote.orders.adClicks') }} <strong>{{ nf.format(adClicks) }}</strong>
      </p>
    </div>
    <p class="mt-2 text-xs text-ink-500">{{ t('advertisePage.reviewNote') }}</p>
    <p v-if="actionError" class="mt-3 text-sm text-red-600">{{ actionError }}</p>

    <div class="mt-5 overflow-x-auto rounded-xl border border-ink-100">
      <table class="w-full min-w-[960px] text-left text-sm">
        <thead class="bg-ink-100/40 text-xs font-bold uppercase tracking-wide text-ink-900">
          <tr>
            <th class="px-4 py-3">{{ t('advertisePage.colTool') }}</th>
            <th class="px-4 py-3">{{ t('advertisePage.colAdLandingLink') }}</th>
            <th class="px-4 py-3">{{ t('advertisePage.colBalances') }}</th>
            <th class="px-4 py-3">{{ t('advertisePage.colPerformance') }}</th>
            <th class="px-4 py-3">{{ t('advertisePage.colStatus') }}</th>
            <th class="px-4 py-3">{{ t('advertisePage.colAction') }}</th>
          </tr>
        </thead>
        <tbody v-if="campaigns.length" class="divide-y divide-ink-100">
          <tr v-for="c in campaigns" :key="c.id" class="align-top">
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <span class="font-semibold text-ink-900">{{ c.tool.name }}</span>
                <span :class="['rounded-full px-2 py-0.5 text-[11px] font-semibold', c.tier === 'FEATURED' ? 'bg-brand-500 text-white' : 'bg-ink-100 text-ink-600']">
                  {{ t(`advertisePage.tiers.${c.tier}`) }}
                </span>
              </div>
              <div class="text-xs text-ink-500">{{ date(c.createdAt) }}</div>
            </td>
            <td class="max-w-[280px] px-4 py-3">
              <form v-if="editing?.id === c.id" class="flex flex-col gap-2" @submit.prevent="saveLanding(c)">
                <input
                  v-model="editing.url"
                  class="w-full rounded-lg border border-ink-200 px-2.5 py-1.5 text-sm outline-none focus:border-brand-300"
                  :placeholder="c.tool.website ?? 'https://'"
                >
                <div class="flex gap-2">
                  <button type="submit" :disabled="busyId === c.id" class="rounded-md bg-brand-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50">{{ t('advertisePage.save') }}</button>
                  <button type="button" class="rounded-md border border-ink-200 px-2.5 py-1 text-xs font-semibold text-ink-600" @click="editing = null">{{ t('advertisePage.cancel') }}</button>
                </div>
                <p class="text-[11px] text-ink-500">{{ t('advertisePage.landingHint') }}</p>
              </form>
              <template v-else>
                <a
                  :href="c.landingUrl ?? c.tool.website ?? '#'"
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  class="block truncate text-brand-600 hover:text-brand-700"
                >{{ c.landingUrl ?? t('advertisePage.toolWebsite') }}</a>
                <p v-if="c.pendingLandingUrl" class="mt-1 truncate text-xs text-amber-700" :title="c.pendingLandingUrl">
                  {{ t('advertisePage.pendingLanding', { url: c.pendingLandingUrl }) }}
                </p>
              </template>
            </td>
            <td class="whitespace-nowrap px-4 py-3 text-ink-900">
              <strong>{{ nf.format(c.clicksRemaining) }}</strong>
              <span class="text-ink-500"> / {{ nf.format(c.clicksPurchased) }}</span>
              <div class="text-xs text-ink-500">{{ t('advertisePage.remaining') }}</div>
            </td>
            <td class="whitespace-nowrap px-4 py-3 text-ink-700">
              <div>{{ t('advertisePage.impressions') }}: <b>{{ nf.format(c.impressions) }}</b></div>
              <div>{{ t('advertisePage.clicks') }}: <b>{{ nf.format(c.clicks) }}</b></div>
              <div>CTR: <b>{{ ctr(c) }}</b></div>
            </td>
            <td class="px-4 py-3">
              <span :class="['whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold', statusClass[c.status]]">{{ t(`advertisePage.statuses.${c.status}`) }}</span>
              <p v-if="c.pausedByAdmin" class="mt-1 text-xs text-ink-500">{{ t('advertisePage.pausedByAdmin') }}</p>
              <p v-if="c.rejectionReason" class="mt-1 max-w-[220px] text-xs text-red-600">{{ t('advertisePage.reason', { reason: c.rejectionReason }) }}</p>
            </td>
            <td class="px-4 py-3">
              <div class="flex flex-col items-start gap-1.5 text-sm font-semibold">
                <template v-if="c.status !== 'REJECTED'">
                  <button
                    v-if="c.status === 'ACTIVE' || c.status === 'EXHAUSTED'"
                    type="button"
                    :disabled="busyId === c.id"
                    class="text-ink-700 hover:text-brand-600 disabled:opacity-50"
                    @click="patch(c, { paused: true })"
                  >{{ t('advertisePage.pause') }}</button>
                  <button
                    v-else-if="c.status === 'PAUSED' && !c.pausedByAdmin"
                    type="button"
                    :disabled="busyId === c.id"
                    class="text-ink-700 hover:text-brand-600 disabled:opacity-50"
                    @click="patch(c, { paused: false })"
                  >{{ t('advertisePage.resume') }}</button>
                  <button
                    v-if="editing?.id !== c.id"
                    type="button"
                    class="text-ink-700 hover:text-brand-600"
                    @click="editing = { id: c.id, url: c.pendingLandingUrl ?? c.landingUrl ?? '' }"
                  >{{ t('advertisePage.editLanding') }}</button>
                </template>
                <NuxtLink :to="{ path: '/advertise', query: { tier: c.tier } }" class="text-brand-600 hover:text-brand-700">{{ t('myPostsPage.buyMore') }}</NuxtLink>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <p v-if="error" class="py-16 text-center text-sm text-red-600">{{ t('websiteInsights.loadError') }}</p>
      <p v-else-if="pending && !campaigns.length" class="py-16 text-center text-sm text-ink-400">{{ t('promote.orders.loading') }}</p>
      <div v-else-if="!campaigns.length" class="flex flex-col items-center gap-4 py-16">
        <p class="text-sm text-ink-900">{{ t('advertisePage.emptyMessage') }}</p>
        <NuxtLink to="/advertise" class="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
          {{ t('advertisePage.createNew') }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
