<script setup lang="ts">
import { researchPlans, RESEARCH_PLANS, planRank, type ResearchPlanKey, type BillingIntervalKey } from '#shared/research'

const { t, locale } = useI18n()

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const { data: myPlan, busy, error, subscribe: subscribeTo, setCancel, openBillingPortal } = useResearchPlan()

const billing = ref<'monthly' | 'yearly'>('monthly')
// Each time it opens: start on the interval the user pays now, without an old error.
// (Not on every plan refresh — Insights refreshes it after each page of credits, which
// would flip the toggle under the user's hand.)
watch(() => props.open, (open) => {
  if (!open) return
  error.value = ''
  billing.value = myPlan.value?.interval === 'YEAR' ? 'yearly' : 'monthly'
}, { immediate: true })
const interval = computed<BillingIntervalKey>(() => (billing.value === 'yearly' ? 'YEAR' : 'MONTH'))

// Prices and quotas from shared/research.ts — the same numbers the server charges.
const plans = RESEARCH_PLANS.map((key) => {
  const p = researchPlans[key]
  return {
    key,
    i18n: key.toLowerCase(),
    monthly: p.price.MONTH,
    yearly: p.price.YEAR,
    popular: p.popular,
    features: [
      { key: 'credits', value: p.quota.dataCredits.toLocaleString('en-US') },
      { key: 'queries', value: String(p.quota.socialQueries) },
      { key: 'export', value: p.quota.exportPerMonth.toLocaleString('en-US') },
      { key: p.filters === 'full' ? 'filteringFull' : 'filtering', value: '' },
      { key: p.stats === 'deep' ? 'statisticsDeep' : 'statistics', value: '' }
    ]
  }
})
type Plan = (typeof plans)[number]

const currentPlan = computed(() => myPlan.value?.plan ?? 'FREE')
// A cancelled plan that can't be resumed (cancelled from the PayPal account, or past its
// period) is not "current": picking it again subscribes anew.
const restartable = computed(() => !!myPlan.value?.cancelAtPeriodEnd && !myPlan.value.canResume)
const isCurrent = (plan: Plan) => currentPlan.value === plan.key && myPlan.value?.interval === interval.value && !restartable.value

// Button label: Subscribe on Free; Upgrade / Downgrade / Switch (monthly ↔ yearly) on a plan.
function actionLabel(plan: Plan) {
  if (isCurrent(plan)) return t('admin.upgradeModal.currentPlan')
  if (currentPlan.value === 'FREE' || (restartable.value && currentPlan.value === plan.key && myPlan.value?.interval === interval.value)) return t('admin.upgradeModal.subscribe')
  const diff = planRank(plan.key) - planRank(currentPlan.value)
  return t(diff > 0 ? 'admin.upgradeModal.upgradeTo' : diff < 0 ? 'admin.upgradeModal.downgradeTo' : 'admin.upgradeModal.switchTo')
}

async function subscribe(plan: Plan) {
  if (isCurrent(plan) || busy.value) return
  // On a plan already: Stripe charges (or credits) the prorated difference right away; a
  // PayPal plan is replaced by a new one approved on PayPal, the unused part refunded.
  const confirmKey = myPlan.value?.provider === 'paypal' ? 'admin.upgradeModal.confirmChangePaypal' : 'admin.upgradeModal.confirmChange'
  if (currentPlan.value !== 'FREE' && !confirm(t(confirmKey, { plan: t(`admin.upgradeModal.plan.${plan.i18n}`) }))) return
  const done = await subscribeTo(plan.key as ResearchPlanKey, interval.value)
  if (done === 'changed') emit('close')
}

const periodEnd = computed(() => (myPlan.value?.currentPeriodEnd
  ? new Date(myPlan.value.currentPeriodEnd).toLocaleDateString(locale.value, { year: 'numeric', month: 'short', day: 'numeric' })
  : ''))

function cancelPlan() {
  if (!confirm(t('admin.upgradeModal.confirmCancel', { date: periodEnd.value }))) return
  setCancel(true)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 px-4 py-8" @click.self="emit('close')">
      <!-- Sized so the three plans fit with their bottom edge in view; the FAQ scrolls in below. -->
      <div class="relative flex max-h-[min(720px,90vh)] w-full max-w-[1164px] flex-col overflow-hidden rounded-lg bg-white shadow-xl">
      <button
        type="button"
        :title="t('admin.upgradeModal.close')"
        class="absolute right-6 top-6 z-10 text-ink-400 hover:text-ink-700"
        @click="emit('close')"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
      </button>
      <div class="overflow-y-auto px-6 pb-12 pt-8 sm:px-10">
        <div class="text-center">
          <h2 class="text-3xl font-bold text-ink-900 sm:text-4xl">{{ t('admin.upgradeModal.title') }}</h2>
          <p class="mt-2 text-base text-ink-500">{{ t('admin.upgradeModal.subtitle') }}</p>
        </div>

        <div class="mt-11 flex items-center justify-center gap-4 text-base text-ink-900">
          <span>{{ t('admin.upgradeModal.monthly') }}</span>
          <button
            type="button"
            :class="['relative inline-flex h-[30px] w-[52px] shrink-0 rounded-full transition-colors', billing === 'yearly' ? 'bg-brand-500' : 'bg-ink-300']"
            @click="billing = billing === 'monthly' ? 'yearly' : 'monthly'"
          >
            <span :class="['absolute top-[2px] h-[26px] w-[26px] rounded-full bg-white shadow transition-transform', billing === 'yearly' ? 'translate-x-[24px]' : 'translate-x-[2px]']"></span>
          </button>
          <span>{{ t('admin.upgradeModal.yearly') }}</span>
          <span class="relative ml-1 rounded bg-brand-100 px-2 py-1 text-sm text-brand-600">
            <span class="absolute -left-1 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rotate-45 bg-brand-100"></span>
            <span class="relative">{{ t('admin.upgradeModal.bestValue') }}</span>
          </span>
        </div>

        <div class="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-9">
          <div
            v-for="plan in plans"
            :key="plan.key"
            :class="[
              'flex flex-col rounded-xl border pb-9 pt-4',
              plan.popular ? 'border-brand-300 bg-gradient-to-b from-brand-100 to-white shadow-lg shadow-brand-100' : 'border-ink-200'
            ]"
          >
            <div class="px-4">
              <div class="flex items-center justify-between gap-2">
                <span class="text-xl font-bold text-ink-900">{{ t(`admin.upgradeModal.plan.${plan.i18n}`) }}</span>
                <span v-if="plan.popular" class="rounded-full bg-brand-200 px-3 py-1 text-sm text-brand-600">🔥 {{ t('admin.upgradeModal.mostPopular') }}</span>
              </div>

              <div class="mt-2 flex items-baseline gap-1">
                <span class="text-4xl font-bold text-ink-900">${{ billing === 'monthly' ? plan.monthly : Math.round(plan.yearly / 12) }}</span>
                <span class="text-sm text-ink-500">/{{ t('admin.upgradeModal.month') }}</span>
              </div>
              <div class="mt-1 text-base text-ink-500">${{ billing === 'monthly' ? plan.monthly * 12 : plan.yearly }} /{{ t('admin.upgradeModal.year') }}</div>

              <p class="mt-4 min-h-[3rem] text-base leading-6 text-ink-500">{{ t(`admin.upgradeModal.desc.${plan.i18n}`) }}</p>

              <button
                type="button"
                :class="[
                  'mt-6 h-10 w-full rounded border px-4 text-sm transition disabled:cursor-default',
                  isCurrent(plan)
                    ? 'border-ink-200 bg-ink-100 text-ink-500'
                    : plan.popular
                    ? 'border-transparent bg-gradient-to-r from-brand-400 to-brand-600 text-white hover:opacity-90'
                    : 'border-brand-500 text-brand-600 hover:bg-brand-50'
                ]"
                :disabled="isCurrent(plan) || !!busy"
                @click="subscribe(plan)"
              >
                {{ busy === `subscribe:${plan.key}:${interval}` ? t('admin.upgradeModal.working') : actionLabel(plan) }}
              </button>
            </div>

            <div class="mt-4 space-y-3 border-t border-ink-100 px-4 pt-4 text-sm leading-5 text-ink-700">
              <div v-for="f in plan.features" :key="f.key" class="flex items-center gap-2">
                <svg class="h-[18px] w-[18px] shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9" /><path stroke-linecap="round" stroke-linejoin="round" d="m8.5 12.5 2.5 2.5 4.5-5" /></svg>
                <span><span v-if="f.value" class="text-brand-600">{{ f.value + ' ' }}</span>{{ t(`admin.upgradeModal.feature.${f.key}`) }}</span>
              </div>
            </div>
          </div>
        </div>

        <p v-if="error" class="mt-5 text-center text-sm text-red-600">{{ error }}</p>

        <div v-if="currentPlan !== 'FREE'" class="mx-auto mt-16 flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-100 bg-ink-50 px-5 py-4 text-sm text-ink-900">
          <div>
            <span class="font-bold">{{ t(`admin.upgradeModal.plan.${currentPlan.toLowerCase()}`) }}</span>
            · {{ t(myPlan?.interval === 'YEAR' ? 'admin.upgradeModal.yearly' : 'admin.upgradeModal.monthly') }}
            <span class="block text-ink-500">
              {{ t(myPlan?.cancelAtPeriodEnd ? 'admin.upgradeModal.endsOn' : 'admin.upgradeModal.renewsOn', { date: periodEnd }) }}
              <template v-if="myPlan?.status === 'past_due'"> · <span class="font-semibold text-red-600">{{ t('admin.upgradeModal.pastDue') }}</span></template>
            </span>
          </div>
          <div class="flex flex-wrap gap-3 font-semibold">
            <button v-if="myPlan?.canManageBilling" type="button" :disabled="!!busy" class="text-brand-600 hover:text-brand-700 disabled:opacity-50" @click="openBillingPortal()">
              {{ t('admin.upgradeModal.manageBilling') }}
            </button>
            <button v-if="myPlan?.cancelAtPeriodEnd && myPlan.canResume" type="button" :disabled="!!busy" class="text-emerald-600 hover:text-emerald-700 disabled:opacity-50" @click="setCancel(false)">
              {{ t('admin.upgradeModal.resume') }}
            </button>
            <span v-else-if="myPlan?.cancelAtPeriodEnd" class="font-normal text-ink-500">{{ t('admin.upgradeModal.cancelledInPaypal') }}</span>
            <button v-else type="button" :disabled="!!busy" class="text-red-500 hover:text-red-600 disabled:opacity-50" @click="cancelPlan">
              {{ t('admin.upgradeModal.cancelPlan') }}
            </button>
          </div>
        </div>

        <div :class="currentPlan !== 'FREE' ? 'mt-10' : 'mt-16'">
          <h3 class="text-center text-xl font-extrabold text-ink-900">{{ t('admin.upgradeModal.faq.title') }}</h3>
          <div class="mx-auto mt-5 max-w-2xl overflow-hidden rounded-xl border border-ink-100">
            <div class="bg-ink-50 px-5 py-3.5 text-base font-bold text-ink-900">
              {{ t('admin.upgradeModal.faq.q1.question') }}
            </div>
            <p class="whitespace-pre-line px-5 py-4 text-base leading-relaxed text-ink-900">{{ t('admin.upgradeModal.faq.q1.answer') }}</p>
          </div>
        </div>
      </div>
      </div>
    </div>
  </Teleport>
</template>
