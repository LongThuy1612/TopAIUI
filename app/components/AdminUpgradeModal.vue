<script setup lang="ts">
const { t } = useI18n()

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const billing = ref<'monthly' | 'yearly'>('monthly')

type Plan = {
  key: 'starter' | 'professional' | 'enterprise'
  monthly: number
  yearly: number
  popular?: boolean
  features: { key: string; value: string }[]
}

const plans: Plan[] = [
  {
    key: 'starter',
    monthly: 19,
    yearly: 182,
    features: [
      { key: 'credits', value: '8,000' },
      { key: 'queries', value: '1' },
      { key: 'filtering', value: '' },
      { key: 'export', value: '' }
    ]
  },
  {
    key: 'professional',
    monthly: 89,
    yearly: 854,
    popular: true,
    features: [
      { key: 'credits', value: '50,000' },
      { key: 'queries', value: '10' },
      { key: 'filtering', value: '' },
      { key: 'statistics', value: '' }
    ]
  },
  {
    key: 'enterprise',
    monthly: 269,
    yearly: 2582,
    features: [
      { key: 'credits', value: '200,000' },
      { key: 'queries', value: '100' },
      { key: 'filtering', value: '' },
      { key: 'statistics', value: '' }
    ]
  }
]

function featureLabel(f: { key: string; value: string }) {
  return f.value ? `${f.value} ${t(`admin.upgradeModal.feature.${f.key}`)}` : t(`admin.upgradeModal.feature.${f.key}`)
}

function subscribe(plan: Plan) {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 px-4 py-8" @click.self="emit('close')">
      <div class="flex max-h-[70vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-xl">
      <div class="overflow-y-auto p-8 sm:p-10">
        <div class="relative text-center">
          <button
            type="button"
            :title="t('admin.upgradeModal.close')"
            class="absolute right-0 top-0 text-ink-400 hover:text-ink-700"
            @click="emit('close')"
          >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
          <h2 class="text-2xl font-extrabold text-ink-900 sm:text-3xl">{{ t('admin.upgradeModal.title') }}</h2>
          <p class="mt-2 text-base text-ink-900">{{ t('admin.upgradeModal.subtitle') }}</p>
        </div>

        <div class="mt-6 flex items-center justify-center gap-3 text-base font-semibold">
          <span :class="billing === 'monthly' ? 'text-ink-900' : 'text-ink-400'">{{ t('admin.upgradeModal.monthly') }}</span>
          <button
            type="button"
            :class="['relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors', billing === 'yearly' ? 'bg-brand-500' : 'bg-ink-300']"
            @click="billing = billing === 'monthly' ? 'yearly' : 'monthly'"
          >
            <span :class="['absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform', billing === 'yearly' ? 'translate-x-5' : 'translate-x-0.5']"></span>
          </button>
          <span :class="billing === 'yearly' ? 'text-ink-900' : 'text-ink-400'">{{ t('admin.upgradeModal.yearly') }}</span>
          <span class="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-bold text-brand-600">{{ t('admin.upgradeModal.bestValue') }}</span>
        </div>

        <div class="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div
            v-for="plan in plans"
            :key="plan.key"
            :class="[
              'flex flex-col rounded-2xl border p-6',
              plan.popular ? 'border-brand-300 bg-brand-50/60 shadow-md' : 'border-ink-200'
            ]"
          >
            <div class="flex items-center gap-2">
              <span class="text-base font-bold text-ink-900">{{ t(`admin.upgradeModal.plan.${plan.key}`) }}</span>
              <span v-if="plan.popular" class="rounded-full bg-brand-500 px-2 py-0.5 text-[11px] font-bold text-white">🔥 {{ t('admin.upgradeModal.mostPopular') }}</span>
            </div>

            <div class="mt-3">
              <span class="text-3xl font-extrabold text-ink-900">${{ billing === 'monthly' ? plan.monthly : Math.round(plan.yearly / 12) }}</span>
              <span class="text-base text-ink-900">/{{ t('admin.upgradeModal.month') }}</span>
            </div>
            <div class="text-xs text-ink-900">${{ billing === 'monthly' ? plan.monthly * 12 : plan.yearly }} /{{ t('admin.upgradeModal.year') }}</div>

            <p class="mt-3 text-base text-ink-900">{{ t(`admin.upgradeModal.desc.${plan.key}`) }}</p>

            <button
              type="button"
              :class="[
                'mt-5 w-full rounded-lg border px-4 py-2.5 text-base font-bold transition',
                plan.popular
                  ? 'border-transparent bg-gradient-to-r from-brand-400 to-brand-600 text-white hover:opacity-90'
                  : 'border-ink-200 text-brand-600 hover:border-brand-300 hover:bg-brand-50'
              ]"
              @click="subscribe(plan)"
            >
              {{ t('admin.upgradeModal.subscribe') }}
            </button>

            <div class="mt-5 space-y-2.5 border-t border-ink-100 pt-5 text-base text-ink-900">
              <div v-for="f in plan.features" :key="f.key" class="flex items-start gap-2">
                <svg class="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m5 13 4 4L19 7" /></svg>
                <span>{{ featureLabel(f) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-10">
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
