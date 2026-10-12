<script setup lang="ts">
import { researchPlans, RESEARCH_PLANS, freeAccess } from '#shared/research'
import { services, SITE_NAME } from '#shared/promote'

const { t } = useI18n()

const billing = ref<'monthly' | 'yearly'>('monthly')

// Prices and quotas from shared/research.ts, the same numbers the upgrade modal shows
// and the server charges. Plan copy reuses the modal's translations (admin.upgradeModal).
const fmt = (n: number) => n.toLocaleString('en-US')
const plans = RESEARCH_PLANS.map((key) => {
  const p = researchPlans[key]
  return {
    key,
    i18n: key.toLowerCase(),
    monthly: p.price.MONTH,
    yearly: p.price.YEAR,
    popular: p.popular,
    features: [
      { key: 'credits', value: fmt(p.quota.dataCredits) },
      { key: 'queries', value: String(p.quota.socialQueries) },
      { key: 'export', value: fmt(p.quota.exportPerMonth) },
      { key: p.filters === 'full' ? 'filteringFull' : 'filtering', value: '' },
      { key: p.stats === 'deep' ? 'statisticsDeep' : 'statistics', value: '' }
    ]
  }
})
// Free has basic filters and no statistics: only its quotas are listed.
const freeFeatures = [
  { key: 'credits', value: fmt(freeAccess.quota.dataCredits) },
  { key: 'queries', value: String(freeAccess.quota.socialQueries) },
  { key: 'export', value: fmt(freeAccess.quota.exportPerMonth) }
]

// The dashboard opens the plan picker on ?upgrade=1 (DashboardSidebar); signed-out
// visitors go through the login page and come back to it.
const UPGRADE_URL = '/dashboard?upgrade=1'

useBreadcrumbLd(() => [[t('footer.pricing'), '/pricing']])

useSeoMeta({
  title: () => t('pricingPage.meta.title'),
  description: () => t('pricingPage.meta.description'),
  ogTitle: () => t('pricingPage.meta.title'),
  ogDescription: () => t('pricingPage.meta.description')
})
</script>

<template>
  <div class="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 lg:px-8">
    <section class="text-center">
      <h1 class="text-3xl font-extrabold text-ink-900 sm:text-5xl">{{ t('pricingPage.title') }}</h1>
      <p class="mx-auto mt-3 max-w-2xl text-ink-600 sm:text-lg">{{ t('pricingPage.subtitle') }}</p>
    </section>

    <div class="mt-9 flex items-center justify-center gap-4 text-base text-ink-900">
      <span>{{ t('admin.upgradeModal.monthly') }}</span>
      <button
        type="button"
        role="switch"
        :aria-checked="billing === 'yearly'"
        :aria-label="t('admin.upgradeModal.yearly')"
        :class="['relative inline-flex h-[30px] w-[52px] shrink-0 rounded-full transition-colors', billing === 'yearly' ? 'bg-brand-500' : 'bg-ink-300']"
        @click="billing = billing === 'monthly' ? 'yearly' : 'monthly'"
      >
        <span :class="['absolute top-[2px] h-[26px] w-[26px] rounded-full bg-white shadow transition-transform', billing === 'yearly' ? 'translate-x-[24px]' : 'translate-x-[2px]']"></span>
      </button>
      <span>{{ t('admin.upgradeModal.yearly') }}</span>
      <span class="rounded bg-brand-100 px-2 py-1 text-sm text-brand-600">{{ t('admin.upgradeModal.bestValue') }}</span>
    </div>

    <div class="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <!-- Free -->
      <div class="flex flex-col rounded-2xl border border-ink-200 bg-white pb-7 pt-5">
        <div class="px-5">
          <span class="text-xl font-bold text-ink-900">{{ t('admin.freePlan') }}</span>
          <div class="mt-2 flex items-baseline gap-1">
            <span class="text-4xl font-bold text-ink-900">$0</span>
            <span class="text-sm text-ink-500">/{{ t('admin.upgradeModal.month') }}</span>
          </div>
          <div class="mt-1 text-base text-ink-500">{{ t('pricingPage.freePrice') }}</div>
          <p class="mt-4 min-h-[3rem] text-sm leading-6 text-ink-500">{{ t('pricingPage.freeDesc') }}</p>
          <NuxtLink to="/dashboard" class="mt-5 flex h-10 w-full items-center justify-center rounded-lg border border-ink-300 text-sm font-semibold text-ink-700 hover:bg-ink-100/60">
            {{ t('pricingPage.getStarted') }}
          </NuxtLink>
        </div>
        <div class="mt-5 space-y-3 border-t border-ink-100 px-5 pt-4 text-sm leading-5 text-ink-700">
          <div v-for="f in freeFeatures" :key="f.key" class="flex items-center gap-2">
            <svg class="h-[18px] w-[18px] shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9" /><path stroke-linecap="round" stroke-linejoin="round" d="m8.5 12.5 2.5 2.5 4.5-5" /></svg>
            <span><span class="text-brand-600">{{ f.value + ' ' }}</span>{{ t(`admin.upgradeModal.feature.${f.key}`) }}</span>
          </div>
        </div>
      </div>

      <div
        v-for="plan in plans"
        :key="plan.key"
        :class="[
          'flex flex-col rounded-2xl border pb-7 pt-5',
          plan.popular ? 'border-brand-300 bg-gradient-to-b from-brand-100 to-white shadow-lg shadow-brand-100' : 'border-ink-200 bg-white'
        ]"
      >
        <div class="px-5">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xl font-bold text-ink-900">{{ t(`admin.upgradeModal.plan.${plan.i18n}`) }}</span>
            <span v-if="plan.popular" class="rounded-full bg-brand-200 px-2.5 py-0.5 text-xs text-brand-600">🔥 {{ t('admin.upgradeModal.mostPopular') }}</span>
          </div>
          <div class="mt-2 flex items-baseline gap-1">
            <span class="text-4xl font-bold text-ink-900">${{ billing === 'monthly' ? plan.monthly : Math.round(plan.yearly / 12) }}</span>
            <span class="text-sm text-ink-500">/{{ t('admin.upgradeModal.month') }}</span>
          </div>
          <div class="mt-1 text-base text-ink-500">${{ billing === 'monthly' ? plan.monthly * 12 : plan.yearly }} /{{ t('admin.upgradeModal.year') }}</div>
          <p class="mt-4 min-h-[3rem] text-sm leading-6 text-ink-500">{{ t(`admin.upgradeModal.desc.${plan.i18n}`) }}</p>
          <NuxtLink
            :to="UPGRADE_URL"
            :class="[
              'mt-5 flex h-10 w-full items-center justify-center rounded-lg text-sm font-semibold transition',
              plan.popular ? 'bg-gradient-to-r from-brand-400 to-brand-600 text-white hover:opacity-90' : 'border border-brand-500 text-brand-600 hover:bg-brand-50'
            ]"
          >
            {{ t('admin.upgradeModal.subscribe') }}
          </NuxtLink>
        </div>
        <div class="mt-5 space-y-3 border-t border-ink-100 px-5 pt-4 text-sm leading-5 text-ink-700">
          <div v-for="f in plan.features" :key="f.key" class="flex items-center gap-2">
            <svg class="h-[18px] w-[18px] shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9" /><path stroke-linecap="round" stroke-linejoin="round" d="m8.5 12.5 2.5 2.5 4.5-5" /></svg>
            <span><span v-if="f.value" class="text-brand-600">{{ f.value + ' ' }}</span>{{ t(`admin.upgradeModal.feature.${f.key}`) }}</span>
          </div>
        </div>
      </div>
    </div>

    <section class="mx-auto mt-16 max-w-3xl">
      <h2 class="text-center text-2xl font-extrabold text-ink-900">{{ t('admin.upgradeModal.faq.title') }}</h2>
      <div class="mt-5 overflow-hidden rounded-2xl border border-ink-200 bg-white">
        <div class="bg-ink-100/50 px-5 py-3.5 font-bold text-ink-900">{{ t('admin.upgradeModal.faq.q1.question') }}</div>
        <p class="whitespace-pre-line px-5 py-4 leading-relaxed text-ink-800">{{ t('admin.upgradeModal.faq.q1.answer') }}</p>
      </div>
    </section>

    <section class="mt-16">
      <h2 class="text-center text-2xl font-extrabold text-ink-900">{{ t('pricingPage.otherTitle') }}</h2>
      <p class="mt-2 text-center text-ink-600">{{ t('pricingPage.otherSubtitle') }}</p>
      <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <NuxtLink v-for="s in services" :key="s.key" :to="s.to" class="group rounded-2xl border border-ink-200 bg-white p-5 transition hover:border-brand-300 hover:shadow-sm">
          <h3 class="font-bold text-ink-900 group-hover:text-brand-600">{{ t(`promote.services.${s.i18n}.title`) }}</h3>
          <p class="mt-1 text-sm leading-relaxed text-ink-600">{{ t(`promote.services.${s.i18n}.desc`, { site: SITE_NAME }) }}</p>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
