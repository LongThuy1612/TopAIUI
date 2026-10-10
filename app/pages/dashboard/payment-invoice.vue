<script setup lang="ts">
import type { OrderRow, OrderType } from '~/composables/useMyOrders'
import { researchPlans } from '#shared/research'

const { t, locale } = useI18n()
const { authHeaders, user, isAdmin } = useAuth()
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const upgradeModalOpen = ref(false)

interface Profile {
  email: string
  name: string | null
  company: string | null
  country: string | null
  phone: string | null
  city: string | null
  state: string | null
  zip: string | null
  address: string | null
  vatNumber: string | null
}

const EDITABLE = ['name', 'company', 'country', 'phone', 'city', 'state', 'zip', 'address', 'vatNumber'] as const

// The form edits a copy; the email comes from the account and is read-only.
const form = reactive<Record<typeof EDITABLE[number], string>>({
  name: '', company: '', country: '', phone: '', city: '', state: '', zip: '', address: '', vatNumber: ''
})

const [{ data: profile, error: profileError }, { data: ordersRes, pending: ordersPending }] = await Promise.all([
  useFetch<Profile>('/api/me/profile', { headers: authHeaders() }),
  useMyOrders()
])

function fillForm(p: Profile | null | undefined) {
  if (!p) return
  for (const key of EDITABLE) form[key] = p[key] ?? ''
}
watch(profile, fillForm, { immediate: true })

const saving = ref(false)
const saveState = ref<'idle' | 'saved' | 'error'>('idle')
let saveStateTimer: ReturnType<typeof setTimeout> | null = null
onBeforeUnmount(() => { if (saveStateTimer) clearTimeout(saveStateTimer) })

async function save() {
  if (saving.value) return
  saving.value = true
  saveState.value = 'idle'
  try {
    const updated = await $fetch<Profile>('/api/me/profile', {
      method: 'PATCH',
      headers: authHeaders(),
      body: { ...form }
    })
    profile.value = updated
    // The sidebar shows the account name from the auth state.
    if (user.value) user.value = { ...user.value, name: updated.name }
    saveState.value = 'saved'
  } catch {
    saveState.value = 'error'
  } finally {
    saving.value = false
    if (saveStateTimer) clearTimeout(saveStateTimer)
    saveStateTimer = setTimeout(() => { saveState.value = 'idle' }, 4000)
  }
}

// ISO 3166-1 alpha-2; names come from the browser in the current language.
const COUNTRY_CODES = 'AD AE AF AG AI AL AM AO AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW'.split(' ')
const countries = computed(() => {
  let names: Intl.DisplayNames | null = null
  try { names = new Intl.DisplayNames([locale.value, 'en'], { type: 'region' }) } catch {}
  return COUNTRY_CODES
    .map(code => ({ code, name: names?.of(code) ?? code }))
    .sort((a, b) => a.name.localeCompare(b.name, locale.value))
})

const orders = computed(() => ordersRes.value?.orders ?? [])

// Research Plan: current plan, this month's quota, and its Stripe charges.
const { data: myPlan, busy: planBusy, error: planError, setCancel, openBillingPortal } = useResearchPlan()
const isPaid = computed(() => !!myPlan.value && myPlan.value.plan !== 'FREE')
const planName = computed(() => (isPaid.value ? t(`admin.upgradeModal.plan.${myPlan.value!.plan.toLowerCase()}`) : t('admin.freePlan')))
const quotaPct = (q: { used: number; limit: number } | undefined) => (q?.limit ? Math.min(100, Math.round((q.used / q.limit) * 100)) : 0)
const nf = computed(() => new Intl.NumberFormat(locale.value))
// Next renewal: the plan's price, unless it was cancelled (then nothing more is charged).
const nextCharge = computed(() => {
  const p = myPlan.value
  if (!p || p.plan === 'FREE' || !p.interval || p.cancelAtPeriodEnd) return null
  return { amount: Math.round(researchPlans[p.plan].price[p.interval] * 100), date: p.currentPeriodEnd }
})
function cancelPlan() {
  if (!confirm(t('admin.upgradeModal.confirmCancel', { date: myPlan.value?.currentPeriodEnd ? date(myPlan.value.currentPeriodEnd) : '' }))) return
  setCancel(true)
}

// Invoice history: promote orders and subscription charges, newest first.
const invoiceStatusClass: Record<string, string> = {
  paid: 'bg-emerald-50 text-emerald-700',
  open: 'bg-amber-50 text-amber-700',
  uncollectible: 'bg-red-50 text-red-600',
  void: 'bg-ink-100 text-ink-500'
}
const history = computed(() => [
  ...orders.value.map(o => ({ kind: 'order' as const, key: o.id, at: o.paidAt ?? o.createdAt, order: o })),
  ...(ordersRes.value?.invoices ?? []).map(inv => ({ kind: 'invoice' as const, key: inv.id, at: inv.paidAt ?? inv.createdAt, invoice: inv }))
].sort((a, b) => b.at.localeCompare(a.at)))
function invoiceDetail(inv: { plan: string | null; interval: string | null; periodStart: string | null; periodEnd: string | null }) {
  const parts = [
    inv.plan ? t(`admin.upgradeModal.plan.${inv.plan.toLowerCase()}`) : '',
    inv.interval ? t(inv.interval === 'YEAR' ? 'admin.upgradeModal.yearly' : 'admin.upgradeModal.monthly') : '',
    inv.periodStart && inv.periodEnd ? `${date(inv.periodStart)} – ${date(inv.periodEnd)}` : ''
  ]
  return parts.filter(Boolean).join(' · ')
}

const typeKey: Record<OrderType, string> = {
  'submit-ai': 'submit',
  'advertise': 'advertise',
  'guest-post': 'guestPost',
  'update-ai': 'update',
  'submit-gpt': 'submitGpt'
}

function detail(o: OrderRow) {
  const p = o.payload
  switch (o.type) {
    case 'submit-ai': return String(p.name ?? '')
    case 'submit-gpt': return String(p.gptUrl ?? '')
    case 'update-ai': return String(p.toolName ?? '')
    case 'advertise': return `${p.toolName ?? ''} · ${t(`advertisePage.tiers.${p.tier === 'FEATURED' ? 'FEATURED' : 'STANDARD'}`)} · ${t('promote.orders.clicks', { n: new Intl.NumberFormat(locale.value).format(Number(p.clicks)) })}`
    case 'guest-post': return t('promote.orders.credits', Number(p.credits))
    default: return ''
  }
}

const money = (cents: number, currency: string) =>
  new Intl.NumberFormat(locale.value, { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100)
const date = (iso: string) => new Date(iso).toLocaleDateString(locale.value, { year: 'numeric', month: 'short', day: 'numeric' })

const inputClass = 'w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400'

useSeoMeta({
  title: () => `${t('paymentInvoicePage.title')} — TopAICollection`
})
</script>

<template>
  <div>
    <h1 class="text-xl font-extrabold text-ink-900">{{ t('paymentInvoicePage.title') }}</h1>

    <div class="mt-4 grid grid-cols-1 gap-6 rounded-xl border border-ink-100 p-6 lg:grid-cols-2 lg:divide-x lg:divide-ink-100">
      <div class="lg:pr-6">
        <h2 class="text-lg font-extrabold text-ink-900">{{ t('paymentInvoicePage.research') }}</h2>

        <div class="mt-4 flex items-center justify-between text-sm font-semibold text-ink-900">
          <span>{{ t('paymentInvoicePage.monthlyQueries') }}</span>
          <span>{{ myPlan ? `${nf.format(myPlan.usage.dataCredits.used)}/${nf.format(myPlan.usage.dataCredits.limit)}` : '--' }}</span>
        </div>
        <div class="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-ink-100">
          <div class="h-full rounded-full bg-blue-400" :style="{ width: `${quotaPct(myPlan?.usage.dataCredits)}%` }"></div>
        </div>

        <div class="mt-4 flex items-center justify-between text-sm font-semibold text-ink-900">
          <span>{{ t('paymentInvoicePage.socialListeningQueries') }}</span>
          <span>{{ myPlan ? `${nf.format(myPlan.usage.socialQueries.used)}/${nf.format(myPlan.usage.socialQueries.limit)}` : '--' }}</span>
        </div>
        <div class="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-ink-100">
          <div class="h-full rounded-full bg-emerald-400" :style="{ width: `${quotaPct(myPlan?.usage.socialQueries)}%` }"></div>
        </div>
        <p v-if="myPlan" class="mt-2 text-xs text-ink-500">{{ t('paymentInvoicePage.quotaResets', { date: date(myPlan.usage.periodEnd) }) }}</p>

        <button
          v-if="!isAdmin"
          type="button"
          class="mt-5 w-full rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-bold text-brand-600 hover:bg-brand-100"
          @click="upgradeModalOpen = true"
        >
          {{ t('paymentInvoicePage.selectPlan') }}
        </button>
      </div>

      <div class="lg:pl-6">
        <h2 class="text-lg font-extrabold text-ink-900">{{ t('paymentInvoicePage.subscription') }}</h2>

        <div class="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div class="text-ink-900">
            <span class="font-semibold">{{ t('paymentInvoicePage.subscriptionPlan') }}:</span> {{ planName }}
            <template v-if="isPaid && myPlan?.interval"> · {{ t(myPlan.interval === 'YEAR' ? 'admin.upgradeModal.yearly' : 'admin.upgradeModal.monthly') }}</template>
          </div>
          <div class="text-ink-900"><span class="font-semibold">{{ t('paymentInvoicePage.subscriptionCard') }}:</span> {{ myPlan?.canManageBilling ? t('paymentInvoicePage.cardInStripe') : '--' }}</div>
          <div class="text-ink-900"><span class="font-semibold">{{ t('paymentInvoicePage.nextChargeAmount') }}:</span> {{ nextCharge ? money(nextCharge.amount, 'usd') : '--' }}</div>
          <div class="text-ink-900">
            <span class="font-semibold">{{ isPaid && myPlan?.cancelAtPeriodEnd ? t('paymentInvoicePage.endsOn') : t('paymentInvoicePage.nextChargeDate') }}:</span>
            {{ isPaid && myPlan?.currentPeriodEnd ? date(myPlan.currentPeriodEnd) : '--' }}
          </div>
        </div>
        <p v-if="myPlan?.status === 'past_due'" class="mt-3 text-sm font-semibold text-red-600">{{ t('admin.upgradeModal.pastDue') }}</p>

        <div class="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            :disabled="!myPlan?.canManageBilling || !!planBusy"
            class="rounded-lg bg-ink-100 px-4 py-2.5 text-sm font-bold text-ink-700 hover:bg-ink-200 disabled:cursor-not-allowed disabled:text-ink-400 disabled:hover:bg-ink-100"
            @click="openBillingPortal()"
          >
            {{ t('paymentInvoicePage.changeCard') }}
          </button>
          <button
            v-if="isPaid && myPlan?.cancelAtPeriodEnd"
            type="button"
            :disabled="!!planBusy"
            class="rounded-lg bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
            @click="setCancel(false)"
          >
            {{ t('admin.upgradeModal.resume') }}
          </button>
          <button
            v-else
            type="button"
            :disabled="!isPaid || !!planBusy"
            class="rounded-lg bg-ink-100 px-4 py-2.5 text-sm font-bold text-ink-700 hover:bg-ink-200 disabled:cursor-not-allowed disabled:text-ink-400 disabled:hover:bg-ink-100"
            @click="cancelPlan"
          >
            {{ t('paymentInvoicePage.unsubscribe') }}
          </button>
        </div>
        <p v-if="planError" class="mt-3 text-sm text-red-600">{{ planError }}</p>
      </div>
    </div>

    <h2 class="mt-8 text-lg font-extrabold text-ink-900">{{ t('paymentInvoicePage.invoiceHistory') }}</h2>

    <div class="mt-4 overflow-x-auto rounded-xl border border-ink-100">
      <table class="w-full min-w-[680px] text-left text-sm">
        <thead class="border-b border-ink-100 text-xs font-bold uppercase tracking-wide text-ink-900">
          <tr>
            <th class="px-4 py-3">{{ t('promote.orders.date') }}</th>
            <th class="px-4 py-3">{{ t('promote.orders.service') }}</th>
            <th class="px-4 py-3">{{ t('promote.orders.details') }}</th>
            <th class="px-4 py-3">{{ t('promote.orders.amount') }}</th>
            <th class="px-4 py-3">{{ t('promote.orders.status') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-ink-100">
          <tr v-for="row in history" :key="row.key">
            <template v-if="row.kind === 'order'">
              <td class="whitespace-nowrap px-4 py-3 text-ink-600">{{ date(row.at) }}</td>
              <td class="whitespace-nowrap px-4 py-3 text-ink-900">{{ typeKey[row.order.type] ? t(`promote.services.${typeKey[row.order.type]}.title`) : row.order.type }}</td>
              <td class="max-w-[260px] truncate px-4 py-3 text-ink-600" :title="detail(row.order)">{{ detail(row.order) }}</td>
              <td class="whitespace-nowrap px-4 py-3 text-ink-900">{{ money(row.order.amount, row.order.currency) }}</td>
              <td class="px-4 py-3">
                <span :class="['whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold', orderStatusClass[row.order.status] ?? 'bg-ink-100 text-ink-500']">{{ t(`promote.orders.statuses.${row.order.status}`) }}</span>
                <p v-if="row.order.refundedAmount > 0 && row.order.status !== 'REFUNDED'" class="mt-1 whitespace-nowrap text-xs text-sky-700">
                  {{ t('promote.orders.partlyRefunded', { amount: money(row.order.refundedAmount, row.order.currency), credits: t('promote.orders.credits', row.order.refundedCredits) }) }}
                </p>
              </td>
            </template>
            <template v-else>
              <td class="whitespace-nowrap px-4 py-3 text-ink-600">{{ date(row.at) }}</td>
              <td class="whitespace-nowrap px-4 py-3 text-ink-900">{{ t('paymentInvoicePage.researchPlan') }}</td>
              <td class="max-w-[260px] truncate px-4 py-3 text-ink-600" :title="invoiceDetail(row.invoice)">
                <a v-if="row.invoice.hostedInvoiceUrl" :href="row.invoice.hostedInvoiceUrl" target="_blank" rel="noopener noreferrer" class="text-brand-600 hover:text-brand-700">{{ invoiceDetail(row.invoice) }}</a>
                <template v-else>{{ invoiceDetail(row.invoice) }}</template>
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-ink-900">{{ money(row.invoice.amount, row.invoice.currency) }}</td>
              <td class="px-4 py-3">
                <span :class="['whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold', invoiceStatusClass[row.invoice.status] ?? 'bg-ink-100 text-ink-500']">{{ t(`paymentInvoicePage.invoiceStatuses.${row.invoice.status}`) }}</span>
              </td>
            </template>
          </tr>
        </tbody>
      </table>
      <p v-if="ordersPending && !history.length" class="py-10 text-center text-sm text-ink-400">{{ t('promote.orders.loading') }}</p>
      <p v-else-if="!history.length" class="py-10 text-center text-sm text-ink-400">{{ t('promote.orders.empty') }}</p>
    </div>

    <h2 class="mt-8 text-lg font-extrabold text-ink-900">{{ t('paymentInvoicePage.profileTitle') }}</h2>

    <p v-if="profileError" class="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{{ t('paymentInvoicePage.loadError') }}</p>

    <form class="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-ink-100 p-6 sm:grid-cols-2" @submit.prevent="save">
      <label class="block">
        <span class="mb-1 block text-sm font-semibold text-ink-900">{{ t('paymentInvoicePage.fieldEmail') }}</span>
        <input :value="profile?.email ?? ''" type="email" readonly :class="[inputClass, 'cursor-not-allowed bg-ink-100/50 text-ink-600']">
        <span class="mt-1 block text-xs text-ink-500">{{ t('paymentInvoicePage.emailHint') }}</span>
      </label>
      <label class="block">
        <span class="mb-1 block text-sm font-semibold text-ink-900">{{ t('paymentInvoicePage.fieldUserName') }}</span>
        <input v-model="form.name" type="text" maxlength="100" autocomplete="name" :class="inputClass">
      </label>

      <label class="block sm:col-span-2">
        <span class="mb-1 block text-sm font-semibold text-ink-900">{{ t('paymentInvoicePage.fieldCompany') }}</span>
        <input v-model="form.company" type="text" maxlength="200" autocomplete="organization" :class="inputClass">
      </label>

      <label class="block">
        <span class="mb-1 block text-sm font-semibold text-ink-900">{{ t('paymentInvoicePage.fieldCountry') }}</span>
        <select v-model="form.country" autocomplete="country" :class="inputClass">
          <option value=""></option>
          <option v-for="c in countries" :key="c.code" :value="c.code">{{ c.name }}</option>
        </select>
      </label>
      <label class="block">
        <span class="mb-1 block text-sm font-semibold text-ink-900">{{ t('paymentInvoicePage.fieldPhone') }}</span>
        <input v-model="form.phone" type="tel" maxlength="40" autocomplete="tel" :class="inputClass">
      </label>

      <label class="block">
        <span class="mb-1 block text-sm font-semibold text-ink-900">{{ t('paymentInvoicePage.fieldCity') }}</span>
        <input v-model="form.city" type="text" maxlength="100" autocomplete="address-level2" :class="inputClass">
      </label>
      <label class="block">
        <span class="mb-1 block text-sm font-semibold text-ink-900">{{ t('paymentInvoicePage.fieldState') }}</span>
        <input v-model="form.state" type="text" maxlength="100" autocomplete="address-level1" :class="inputClass">
      </label>

      <label class="block">
        <span class="mb-1 block text-sm font-semibold text-ink-900">{{ t('paymentInvoicePage.fieldZip') }}</span>
        <input v-model="form.zip" type="text" maxlength="20" autocomplete="postal-code" :class="inputClass">
      </label>
      <label class="block">
        <span class="mb-1 block text-sm font-semibold text-ink-900">{{ t('paymentInvoicePage.fieldVatNumber') }}</span>
        <input v-model="form.vatNumber" type="text" maxlength="40" :class="inputClass">
      </label>

      <label class="block sm:col-span-2">
        <span class="mb-1 block text-sm font-semibold text-ink-900">{{ t('paymentInvoicePage.fieldAddress') }}</span>
        <input v-model="form.address" type="text" maxlength="300" autocomplete="street-address" :class="inputClass">
      </label>

      <div class="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button
          type="submit"
          class="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="saving || !profile"
        >
          {{ t('paymentInvoicePage.save') }}
        </button>
        <span v-if="saveState === 'saved'" class="text-sm font-semibold text-emerald-600" role="status">{{ t('paymentInvoicePage.saved') }}</span>
        <span v-else-if="saveState === 'error'" class="text-sm font-semibold text-red-600" role="alert">{{ t('paymentInvoicePage.saveError') }}</span>
      </div>
    </form>
    <UpgradeModal :open="upgradeModalOpen" @close="upgradeModalOpen = false" />
  </div>
</template>
