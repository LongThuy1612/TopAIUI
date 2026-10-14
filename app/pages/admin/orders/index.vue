<script setup lang="ts">
import type { OrderType } from '~/composables/useMyOrders'

// Admin → Orders: every customer's payments — promote orders and Research Plans.
interface AdminOrder {
  id: string; type: OrderType; payload: Record<string, unknown>; amount: number; currency: string
  status: string; provider: string; stripeSessionId: string; paypalCaptureId: string | null
  createdAt: string; paidAt: string | null; refundedCredits: number; refundedAmount: number
  user: { id: string; email: string }
}
interface AdminPlan {
  id: string; plan: string; interval: string; status: string; provider: string; providerStatus: string | null
  stripeSubscriptionId: string; currentPeriodStart: string; currentPeriodEnd: string; cancelAtPeriodEnd: boolean; createdAt: string
  user: { id: string; email: string }
  invoices: { id: string; amount: number; currency: string; status: string; paidAt: string | null; createdAt: string; refundedAmount: number; refundDue: number; stripeInvoiceId: string }[]
}
interface Totals { orders: { count: number; amount: number }; plans: { count: number; amount: number; live: number } }
type Response = { tab: 'orders'; items: AdminOrder[] } | { tab: 'plans'; items: AdminPlan[] }

const { t, locale } = useI18n()
definePageMeta({ layout: 'dashboard', middleware: ['auth', 'admin'] })
const { authHeaders } = useAuth()

const tab = ref<'orders' | 'plans'>('orders')
const orderStatus = ref<'PAID' | 'PENDING' | 'EXPIRED' | 'REFUNDED' | 'all'>('PAID')
const planStatus = ref<'live' | 'pending' | 'ended' | 'all'>('live')
const type = ref<'' | OrderType>('')
const search = ref('')
// The search box asks the server once typing pauses.
const q = ref('')
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, (v) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { q.value = v.trim() }, 350)
})
const page = ref(1)
watch([tab, orderStatus, planStatus, type, q], () => { page.value = 1 })

const { data, pending } = await useFetch<Response & { total: number; pageCount: number; totals: Totals }>('/api/admin/payments', {
  query: computed(() => ({
    tab: tab.value,
    status: tab.value === 'orders' ? orderStatus.value : planStatus.value,
    type: tab.value === 'orders' ? type.value || undefined : undefined,
    q: q.value || undefined,
    page: page.value
  })),
  headers: () => authHeaders()
})
const orders = computed(() => (data.value?.tab === 'orders' ? data.value.items : []))
const plans = computed(() => (data.value?.tab === 'plans' ? data.value.items : []))

const typeKey: Record<OrderType, string> = { 'submit-ai': 'submit', 'advertise': 'advertise', 'guest-post': 'guestPost', 'update-ai': 'update', 'submit-gpt': 'submitGpt' }
const serviceOf = (o: AdminOrder) => typeKey[o.type] ? t(`promote.services.${typeKey[o.type]}.title`) : o.type
function detail(o: AdminOrder) {
  const p = o.payload
  switch (o.type) {
    case 'submit-ai': return String(p.name ?? '')
    case 'submit-gpt': return String(p.gptUrl ?? '')
    case 'update-ai': return String(p.toolName ?? '')
    case 'advertise': return `${p.toolName ?? ''} · ${t('promote.orders.clicks', { n: nf.value.format(Number(p.clicks)) })}`
    case 'guest-post': return t('promote.orders.credits', Number(p.credits))
    default: return ''
  }
}
const nf = computed(() => new Intl.NumberFormat(locale.value))
const money = (cents: number, currency = 'usd') =>
  new Intl.NumberFormat(locale.value, { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100)
const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(locale.value, { year: 'numeric', month: 'short', day: 'numeric' }) : '—')
const planName = (p: AdminPlan) => `${t(`admin.upgradeModal.plan.${p.plan.toLowerCase()}`)} · ${t(p.interval === 'YEAR' ? 'admin.upgradeModal.yearly' : 'admin.upgradeModal.monthly')}`
const paidOf = (p: AdminPlan) => p.invoices.filter(i => i.paidAt).reduce((n, i) => n + i.amount - i.refundedAmount, 0)

const orderStatusClass: Record<string, string> = {
  PAID: 'bg-emerald-50 text-emerald-700',
  PENDING: 'bg-amber-50 text-amber-700',
  EXPIRED: 'bg-ink-100 text-ink-500',
  REFUNDED: 'bg-sky-50 text-sky-700'
}
const planStatusClass = (s: string) => ['active', 'trialing'].includes(s)
  ? 'bg-emerald-50 text-emerald-700'
  : s === 'past_due' || s.startsWith('incomplete') ? 'bg-amber-50 text-amber-700' : 'bg-ink-100 text-ink-500'

const pill = (on: boolean) => ['rounded-full border px-3 py-1.5 text-sm font-semibold transition', on ? 'border-brand-500 bg-brand-500 text-white' : 'border-ink-200 text-ink-600 hover:border-brand-300']

useSeoMeta({ title: () => `${t('adminOrders.title')} — TopAICollection` })
</script>

<template>
  <div>
    <h1 class="flex items-center gap-2 text-xl font-extrabold text-ink-900"><span>🧾</span> {{ t('adminOrders.title') }}</h1>

    <div v-if="data?.totals" class="mt-4 grid gap-3 sm:grid-cols-3">
      <div class="rounded-xl border border-ink-100 p-4">
        <div class="text-xs text-ink-500">{{ t('adminOrders.totalOrders') }}</div>
        <div class="mt-1 text-lg font-extrabold text-ink-900">{{ money(data.totals.orders.amount) }}</div>
        <div class="text-xs text-ink-400">{{ t('adminOrders.count', { n: nf.format(data.totals.orders.count) }) }}</div>
      </div>
      <div class="rounded-xl border border-ink-100 p-4">
        <div class="text-xs text-ink-500">{{ t('adminOrders.totalPlans') }}</div>
        <div class="mt-1 text-lg font-extrabold text-ink-900">{{ money(data.totals.plans.amount) }}</div>
        <div class="text-xs text-ink-400">{{ t('adminOrders.count', { n: nf.format(data.totals.plans.count) }) }}</div>
      </div>
      <div class="rounded-xl border border-ink-100 p-4">
        <div class="text-xs text-ink-500">{{ t('adminOrders.livePlans') }}</div>
        <div class="mt-1 text-lg font-extrabold text-ink-900">{{ nf.format(data.totals.plans.live) }}</div>
      </div>
    </div>

    <div class="mt-5 flex flex-wrap items-center gap-2 border-b border-ink-100 text-sm font-semibold">
      <button
        v-for="k in (['orders', 'plans'] as const)"
        :key="k"
        type="button"
        :class="['-mb-px border-b-2 px-1 pb-2.5 mr-4', tab === k ? 'border-brand-500 text-brand-600' : 'border-transparent text-ink-400 hover:text-ink-600']"
        @click="tab = k"
      >
        {{ t(`adminOrders.tabs.${k}`) }}
      </button>
    </div>

    <div class="mt-4 flex flex-wrap items-center gap-2">
      <template v-if="tab === 'orders'">
        <button v-for="s in (['PAID', 'PENDING', 'REFUNDED', 'EXPIRED', 'all'] as const)" :key="s" type="button" :class="pill(orderStatus === s)" @click="orderStatus = s">
          {{ s === 'all' ? t('adminOrders.all') : t(`promote.orders.statuses.${s}`) }}
        </button>
        <select v-model="type" class="rounded-lg border border-ink-200 px-3 py-1.5 text-sm outline-none focus:border-brand-400">
          <option value="">{{ t('adminOrders.allServices') }}</option>
          <option v-for="(k, ty) in typeKey" :key="ty" :value="ty">{{ t(`promote.services.${k}.title`) }}</option>
        </select>
      </template>
      <template v-else>
        <button v-for="s in (['live', 'pending', 'ended', 'all'] as const)" :key="s" type="button" :class="pill(planStatus === s)" @click="planStatus = s">
          {{ t(`adminOrders.planFilters.${s}`) }}
        </button>
      </template>
      <input v-model="search" type="search" :placeholder="t('adminOrders.searchEmail')" class="ml-auto w-full rounded-lg border border-ink-200 px-3 py-1.5 text-sm outline-none focus:border-brand-400 sm:w-64">
    </div>

    <div :class="['mt-4 overflow-x-auto rounded-xl border border-ink-100 transition', pending && 'opacity-60']">
      <table v-if="tab === 'orders'" class="w-full min-w-[900px] text-left text-sm">
        <thead class="bg-ink-100/40 text-xs uppercase tracking-wide text-ink-400">
          <tr>
            <th class="px-4 py-3">{{ t('promote.orders.date') }}</th>
            <th class="px-4 py-3">{{ t('adminOrders.customer') }}</th>
            <th class="px-4 py-3">{{ t('promote.orders.service') }}</th>
            <th class="px-4 py-3">{{ t('promote.orders.details') }}</th>
            <th class="px-4 py-3">{{ t('promote.orders.amount') }}</th>
            <th class="px-4 py-3">{{ t('promote.orders.status') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-ink-100">
          <tr v-for="o in orders" :key="o.id">
            <td class="whitespace-nowrap px-4 py-3 text-ink-600">{{ date(o.paidAt ?? o.createdAt) }}</td>
            <td class="max-w-[200px] truncate px-4 py-3" :title="o.user.email"><NuxtLinkLocale :to="`/admin/users/${o.user.id}`" class="text-brand-600 hover:underline">{{ o.user.email }}</NuxtLinkLocale></td>
            <td class="whitespace-nowrap px-4 py-3 text-ink-900">{{ serviceOf(o) }}</td>
            <td class="max-w-[260px] px-4 py-3 text-ink-600">
              <div class="truncate" :title="detail(o)">{{ detail(o) }}</div>
              <div class="truncate text-xs text-ink-400" :title="o.paypalCaptureId ?? o.stripeSessionId">{{ o.provider === 'paypal' ? 'PayPal' : 'Stripe' }} · {{ o.paypalCaptureId ?? o.stripeSessionId }}</div>
            </td>
            <td class="whitespace-nowrap px-4 py-3 text-ink-900">{{ money(o.amount, o.currency) }}</td>
            <td class="px-4 py-3">
              <span :class="['whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold', orderStatusClass[o.status] ?? 'bg-ink-100 text-ink-500']">{{ t(`promote.orders.statuses.${o.status}`) }}</span>
              <p v-if="o.refundedAmount > 0 && o.status !== 'REFUNDED'" class="mt-1 whitespace-nowrap text-xs text-sky-700">
                {{ t('promote.orders.partlyRefunded', { amount: money(o.refundedAmount, o.currency), credits: t('promote.orders.credits', o.refundedCredits) }) }}
              </p>
            </td>
          </tr>
        </tbody>
      </table>

      <table v-else class="w-full min-w-[900px] text-left text-sm">
        <thead class="bg-ink-100/40 text-xs uppercase tracking-wide text-ink-400">
          <tr>
            <th class="px-4 py-3">{{ t('adminOrders.started') }}</th>
            <th class="px-4 py-3">{{ t('adminOrders.customer') }}</th>
            <th class="px-4 py-3">{{ t('paymentInvoicePage.researchPlan') }}</th>
            <th class="px-4 py-3">{{ t('adminOrders.period') }}</th>
            <th class="px-4 py-3">{{ t('adminOrders.charges') }}</th>
            <th class="px-4 py-3">{{ t('promote.orders.status') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-ink-100">
          <tr v-for="p in plans" :key="p.id" class="align-top">
            <td class="whitespace-nowrap px-4 py-3 text-ink-600">{{ date(p.createdAt) }}</td>
            <td class="max-w-[200px] truncate px-4 py-3" :title="p.user.email"><NuxtLinkLocale :to="`/admin/users/${p.user.id}`" class="text-brand-600 hover:underline">{{ p.user.email }}</NuxtLinkLocale></td>
            <td class="max-w-[230px] px-4 py-3 text-ink-900">
              {{ planName(p) }}
              <div class="truncate text-xs text-ink-400" :title="p.stripeSubscriptionId">{{ p.provider === 'paypal' ? 'PayPal' : 'Stripe' }} · {{ p.stripeSubscriptionId }}</div>
            </td>
            <td class="whitespace-nowrap px-4 py-3 text-ink-600">
              {{ date(p.currentPeriodStart) }} – {{ date(p.currentPeriodEnd) }}
              <div v-if="p.cancelAtPeriodEnd" class="text-xs text-amber-700">{{ t('adminOrders.cancelsAtEnd') }}</div>
            </td>
            <td class="min-w-[170px] px-4 py-3 text-ink-900">
              <div class="font-semibold">{{ money(paidOf(p), p.invoices[0]?.currency) }}</div>
              <div v-for="i in p.invoices.slice(0, 3)" :key="i.id" class="text-xs text-ink-500">
                {{ date(i.paidAt ?? i.createdAt) }} · {{ money(i.amount, i.currency) }} · {{ t(`paymentInvoicePage.invoiceStatuses.${i.status}`) }}
                <span v-if="i.refundedAmount" class="text-sky-700">· {{ t('paymentInvoicePage.refundedAmount', { amount: money(i.refundedAmount, i.currency) }) }}</span>
              </div>
              <div v-if="!p.invoices.length" class="text-xs text-amber-700">{{ t('adminOrders.noCharge') }}</div>
            </td>
            <td class="px-4 py-3">
              <span :class="['whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold', planStatusClass(p.status)]">{{ t(`adminOrders.planStatuses.${p.status}`) }}</span>
            </td>
          </tr>
        </tbody>
      </table>

      <p v-if="!pending && !(tab === 'orders' ? orders.length : plans.length)" class="py-12 text-center text-sm text-ink-400">{{ t('adminOrders.empty') }}</p>
    </div>

    <nav v-if="(data?.pageCount ?? 1) > 1" class="mt-6 flex flex-wrap justify-center gap-1.5">
      <button
        v-for="p in data!.pageCount"
        :key="p"
        type="button"
        :class="['min-w-9 rounded-lg border px-3 py-1.5 text-center text-sm font-semibold', p === page ? 'border-brand-500 bg-brand-500 text-white' : 'border-ink-200 text-ink-700 hover:border-brand-300']"
        @click="page = p"
      >{{ p }}</button>
    </nav>
  </div>
</template>
