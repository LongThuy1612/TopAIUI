<script setup lang="ts">
const { t, locale } = useI18n()
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const { data, pending, error } = await useMyOrders()

// Each advertise order is one campaign: the tool, where the ad points and the
// clicks bought. Paid clicks are pooled into the account's ad-click balance.
const campaigns = computed(() => (data.value?.orders ?? []).filter(o => o.type === 'advertise'))
const adClicks = computed(() => data.value?.adClicks ?? 0)

const nf = computed(() => new Intl.NumberFormat(locale.value))
const date = (iso: string) => new Date(iso).toLocaleDateString(locale.value, { year: 'numeric', month: 'short', day: 'numeric' })

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

    <div class="mt-5 overflow-x-auto rounded-xl border border-ink-100">
      <table class="w-full min-w-[700px] text-left text-sm">
        <thead class="bg-ink-100/40 text-xs font-bold uppercase tracking-wide text-ink-900">
          <tr>
            <th class="px-4 py-3">{{ t('advertisePage.colTool') }}</th>
            <th class="px-4 py-3">{{ t('advertisePage.colAdLandingLink') }}</th>
            <th class="px-4 py-3">{{ t('advertisePage.colBalances') }}</th>
            <th class="px-4 py-3">{{ t('advertisePage.colStatus') }}</th>
            <th class="px-4 py-3">{{ t('advertisePage.colAction') }}</th>
          </tr>
        </thead>
        <tbody v-if="campaigns.length" class="divide-y divide-ink-100">
          <tr v-for="o in campaigns" :key="o.id">
            <td class="px-4 py-3">
              <div class="font-semibold text-ink-900">{{ o.payload.toolName }}</div>
              <div class="text-xs text-ink-500">{{ date(o.paidAt ?? o.createdAt) }}</div>
            </td>
            <td class="max-w-[260px] truncate px-4 py-3">
              <a v-if="o.payload.landingUrl" :href="String(o.payload.landingUrl)" target="_blank" rel="noopener noreferrer nofollow" class="text-brand-600 hover:text-brand-700">{{ o.payload.landingUrl }}</a>
              <span v-else class="text-ink-400">—</span>
            </td>
            <td class="whitespace-nowrap px-4 py-3 text-ink-900">{{ t('promote.orders.clicks', { n: nf.format(Number(o.payload.clicks) || 0) }) }}</td>
            <td class="px-4 py-3">
              <span :class="['whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold', orderStatusClass[o.status] ?? 'bg-ink-100 text-ink-500']">{{ t(`promote.orders.statuses.${o.status}`) }}</span>
            </td>
            <td class="px-4 py-3">
              <NuxtLink to="/advertise" class="font-semibold text-brand-600 hover:text-brand-700">{{ t('myPostsPage.buyMore') }}</NuxtLink>
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
