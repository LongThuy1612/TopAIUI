<script setup lang="ts">
// Admin → user page: the user's guest-post credit orders and a button per order that
// refunds its unused credits through Stripe (server/utils/creditRefunds.ts).
const props = defineProps<{ userId: string }>()
const { t, locale } = useI18n()
const { authHeaders } = useAuth()

interface CreditOrder {
  id: string
  amount: number
  currency: string
  status: 'PAID' | 'REFUNDED'
  createdAt: string
  paidAt: string | null
  credits: number
  refundedCredits: number
  refundedAmount: number
  refundable: { credits: number; amount: number }
}

const { data, refresh } = await useFetch<{ postCredits: number; orders: CreditOrder[] }>(() => `/api/admin/users/${props.userId}/credit-orders`, {
  headers: authHeaders()
})

const money = (cents: number, currency: string) =>
  new Intl.NumberFormat(locale.value, { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100)
const date = (iso: string) => new Date(iso).toLocaleDateString(locale.value, { year: 'numeric', month: 'short', day: 'numeric' })

const busyId = ref<string | null>(null)
const error = ref('')
const done = ref('')

async function refund(o: CreditOrder) {
  const { credits, amount } = o.refundable
  if (!confirm(t('adminCreditRefunds.confirm', { credits, amount: money(amount, o.currency) }))) return
  busyId.value = o.id
  error.value = ''
  done.value = ''
  try {
    await $fetch(`/api/admin/users/${props.userId}/credit-refund`, { method: 'POST', headers: authHeaders(), body: { orderId: o.id, credits, amount } })
    done.value = t('adminCreditRefunds.done', { credits, amount: money(amount, o.currency) })
  } catch (e: any) {
    error.value = e?.data?.message || t('admin.saveError')
  } finally {
    busyId.value = null
    await refresh()
  }
}
</script>

<template>
  <section>
    <h2 class="text-lg font-extrabold text-ink-900">{{ t('adminCreditRefunds.title') }}</h2>
    <p class="mt-1 text-sm text-ink-600">
      {{ t('adminCreditRefunds.balance') }}: <b>{{ data?.postCredits ?? 0 }}</b> · {{ t('adminCreditRefunds.hint') }}
    </p>
    <p v-if="done" class="mt-2 text-sm text-emerald-600">{{ done }}</p>
    <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>

    <div class="mt-3 overflow-x-auto rounded-xl border border-ink-100">
      <table class="w-full min-w-[640px] text-left text-sm">
        <thead class="bg-ink-100/40 text-xs uppercase tracking-wide text-ink-400">
          <tr>
            <th class="px-4 py-3">{{ t('promote.orders.date') }}</th>
            <th class="px-4 py-3">{{ t('adminCreditRefunds.bought') }}</th>
            <th class="px-4 py-3">{{ t('promote.orders.amount') }}</th>
            <th class="px-4 py-3">{{ t('adminCreditRefunds.refunded') }}</th>
            <th class="px-4 py-3 text-right" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="o in data?.orders ?? []" :key="o.id" class="border-t border-ink-100">
            <td class="whitespace-nowrap px-4 py-3 text-ink-600">{{ date(o.paidAt ?? o.createdAt) }}</td>
            <td class="px-4 py-3 text-ink-900">{{ t('promote.orders.credits', o.credits) }}</td>
            <td class="whitespace-nowrap px-4 py-3 text-ink-900">{{ money(o.amount, o.currency) }}</td>
            <td class="whitespace-nowrap px-4 py-3 text-ink-600">
              <template v-if="o.refundedCredits">{{ t('promote.orders.credits', o.refundedCredits) }} · {{ money(o.refundedAmount, o.currency) }}</template>
              <template v-else>—</template>
            </td>
            <td class="whitespace-nowrap px-4 py-3 text-right">
              <button
                v-if="o.refundable.credits > 0"
                type="button"
                :disabled="busyId !== null"
                class="text-sm font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-50"
                @click="refund(o)"
              >
                {{ t('adminCreditRefunds.refund', { credits: o.refundable.credits, amount: money(o.refundable.amount, o.currency) }) }}
              </button>
              <span v-else-if="o.status === 'REFUNDED'" class="text-xs text-sky-700">{{ t('promote.orders.statuses.REFUNDED') }}</span>
              <span v-else class="text-xs text-ink-400">{{ t('adminCreditRefunds.nothing') }}</span>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!data?.orders.length" class="py-8 text-center text-sm text-ink-400">{{ t('adminCreditRefunds.empty') }}</p>
    </div>
  </section>
</template>
