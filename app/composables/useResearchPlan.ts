import type { BillingIntervalKey, FilterLevel, ResearchPlanKey, StatsLevel } from '#shared/research'

// The logged-in user's Research Plan + this month's quota (GET /api/me/plan), shared by
// the sidebar box, the Upgrade modal and Payment & Invoice (one key → one request), and
// the actions on it. Paying for a plan goes through Stripe Checkout; changing, cancelling
// and resuming are done in place (server/utils/research.ts).
export interface MyPlan {
  plan: ResearchPlanKey | 'FREE'
  interval: BillingIntervalKey | null
  status: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  canManageBilling: boolean
  filters: FilterLevel
  stats: StatsLevel
  usage: {
    periodEnd: string
    dataCredits: { used: number; limit: number }
    socialQueries: { used: number; limit: number } // active queries / plan limit
    exportRows: { used: number; limit: number; perRequest: number }
  }
}

export function useResearchPlan() {
  const { authHeaders } = useAuth()
  const { t } = useI18n()
  const fetched = useFetch<MyPlan>('/api/me/plan', { key: 'my-plan', headers: authHeaders() })
  const busy = useState<string | null>('my-plan-busy', () => null)
  const error = useState<string>('my-plan-error', () => '')

  async function run<T>(name: string, fn: () => Promise<T>) {
    busy.value = name
    error.value = ''
    let leaving = false
    try {
      const result = await fn()
      // Off to Stripe: stay busy until the browser has left, so a second click can't
      // open a second checkout.
      leaving = result === 'redirect'
      return result
    } catch (e: any) {
      error.value = e?.data?.message || t('admin.upgradeModal.error')
      return null
    } finally {
      if (!leaving) busy.value = null
    }
  }

  // Free → Stripe Checkout (leaves the page); on a plan → changed in place.
  const subscribe = (plan: ResearchPlanKey, interval: BillingIntervalKey) => run(`subscribe:${plan}:${interval}`, async () => {
    const res = await $fetch<{ checkoutUrl?: string; changed?: boolean }>('/api/billing/subscribe', {
      method: 'POST', headers: authHeaders(), body: { plan, interval }
    })
    if (res.checkoutUrl) {
      await navigateTo(res.checkoutUrl, { external: true })
      return 'redirect' as const
    }
    await refreshPlanAndInvoices()
    return 'changed' as const
  })

  const setCancel = (cancel: boolean) => run(cancel ? 'cancel' : 'resume', async () => {
    await $fetch('/api/billing/cancel', { method: 'POST', headers: authHeaders(), body: { cancel } })
    await fetched.refresh()
  })

  const openBillingPortal = () => run('portal', async () => {
    const { url } = await $fetch<{ url: string }>('/api/billing/portal', { method: 'POST', headers: authHeaders() })
    await navigateTo(url, { external: true })
    return 'redirect' as const
  })

  // A plan change charges a prorated invoice: the invoice list changes too.
  async function refreshPlanAndInvoices() {
    await Promise.all([fetched.refresh(), refreshNuxtData('my-orders')])
  }

  return { ...fetched, busy, error, subscribe, setCancel, openBillingPortal, refreshPlanAndInvoices }
}
