<script setup lang="ts">
type OrderType = 'submit-ai' | 'advertise' | 'guest-post' | 'update-ai' | 'submit-gpt'

interface OrderRow {
  id: string
  type: OrderType
  payload: Record<string, unknown>
  amount: number
  currency: string
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'REFUNDED'
  createdAt: string
}

const route = useRoute()
const { t } = useI18n()
const { token, load } = useAuth()

const postCredits = ref(0)
const adClicks = ref(0)
const orders = ref<OrderRow[]>([])
const loading = ref(true)

onMounted(async () => {
  load()
  if (!token.value) {
    await navigateTo({ path: '/login', query: { redirect: route.path } })
    return
  }
  try {
    const res = await $fetch<{ postCredits: number; adClicks: number; orders: OrderRow[] }>('/api/orders', {
      headers: { 'x-user-token': token.value }
    })
    postCredits.value = res.postCredits
    adClicks.value = res.adClicks
    orders.value = res.orders
  } catch {
    await navigateTo({ path: '/login', query: { redirect: route.path } })
  } finally {
    loading.value = false
  }
})

const typeKey: Record<OrderType, string> = {
  'submit-ai': 'submit',
  'advertise': 'advertise',
  'guest-post': 'guestPost',
  'update-ai': 'update',
  'submit-gpt': 'submitGpt'
}

const nf = new Intl.NumberFormat('en-US')
function detail(o: OrderRow) {
  const p = o.payload
  switch (o.type) {
    case 'submit-ai': return String(p.name ?? '')
    case 'submit-gpt': return String(p.gptUrl ?? '')
    case 'update-ai': return String(p.toolName ?? '')
    case 'advertise': return `${p.toolName ?? ''} · ${t('promote.orders.clicks', { n: nf.format(Number(p.clicks)) })}`
    case 'guest-post': return t('promote.orders.credits', Number(p.credits))
  }
}

const money = (cents: number, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100)
const date = (iso: string) => new Date(iso).toLocaleString()
const statusClass: Record<OrderRow['status'], string> = {
  PAID: 'bg-emerald-50 text-emerald-700',
  PENDING: 'bg-amber-50 text-amber-700',
  EXPIRED: 'bg-ink-100 text-ink-500',
  REFUNDED: 'bg-sky-50 text-sky-700'
}

useSeoMeta({ title: () => `${t('promote.myOrders')} — TopAICollection`, robots: 'noindex' })
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-10 sm:px-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-extrabold text-ink-900">{{ t('promote.myOrders') }}</h1>
      <NuxtLink to="/submit" class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">
        {{ t('promote.orders.newOrder') }}
      </NuxtLink>
    </div>

    <div class="mt-4 flex flex-wrap gap-6 text-sm text-ink-600">
      <p>{{ t('promote.orders.postCredits') }} <strong class="text-ink-900">{{ postCredits }}</strong></p>
      <p>{{ t('promote.orders.adClicks') }} <strong class="text-ink-900">{{ nf.format(adClicks) }}</strong></p>
    </div>

    <div class="mt-6 overflow-x-auto rounded-xl border border-ink-100">
      <table class="w-full min-w-[720px] text-left text-sm">
        <thead class="bg-ink-100/40 text-xs font-bold uppercase tracking-wide text-ink-900">
          <tr>
            <th class="px-4 py-3">{{ t('promote.orders.date') }}</th>
            <th class="px-4 py-3">{{ t('promote.orders.service') }}</th>
            <th class="px-4 py-3">{{ t('promote.orders.details') }}</th>
            <th class="px-4 py-3">{{ t('promote.orders.amount') }}</th>
            <th class="px-4 py-3">{{ t('promote.orders.status') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-ink-100">
          <tr v-for="o in orders" :key="o.id">
            <td class="whitespace-nowrap px-4 py-3 text-ink-600">{{ date(o.createdAt) }}</td>
            <td class="whitespace-nowrap px-4 py-3 text-ink-900">{{ typeKey[o.type] ? t(`promote.services.${typeKey[o.type]}.title`) : o.type }}</td>
            <td class="max-w-[260px] truncate px-4 py-3 text-ink-600">{{ detail(o) }}</td>
            <td class="px-4 py-3 text-ink-900">{{ money(o.amount, o.currency) }}</td>
            <td class="px-4 py-3">
              <span :class="['rounded-full px-2.5 py-0.5 text-xs font-semibold', statusClass[o.status]]">{{ t(`promote.orders.statuses.${o.status}`) }}</span>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="loading" class="py-12 text-center text-sm text-ink-400">{{ t('promote.orders.loading') }}</p>
      <p v-else-if="!orders.length" class="py-12 text-center text-sm text-ink-400">{{ t('promote.orders.empty') }}</p>
    </div>
  </div>
</template>
