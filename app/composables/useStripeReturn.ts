// After Stripe sends the buyer back (?session_id=…) — or PayPal (?paypal=1&token=<order id>),
// whose payment is only captured by these polls (server/utils/paypal.ts) — wait until the order is fulfilled
// and then go to the tool it created / updates (/dashboard/my-ais/:id), or for an ad
// order to the campaign list (/dashboard/advertise). Stops polling
// once the page is left, so a late answer never navigates the buyer from elsewhere.
// `paypalResult` (shared with PromoteShell's notice): a PayPal return only means the buyer
// approved — 'paid' once the money is captured, 'failed' when the capture was declined.
export const usePaypalResult = () => useState<'paid' | 'failed' | null>('paypal-return-result', () => null)

export function useStripeReturn() {
  const paypalResult = usePaypalResult()
  // Shared state outlives the page: a result from an earlier return must not show here.
  paypalResult.value = null
  const route = useRoute()
  const localePath = useLocalePath()
  const { token, load } = useAuth()
  let alive = true
  onBeforeUnmount(() => { alive = false })
  onMounted(async () => {
    const sessionId = route.query.paypal === '1' ? route.query.token : route.query.session_id
    if (typeof sessionId !== 'string') return
    load()
    if (!token.value) return
    for (let i = 0; i < 15 && alive; i++) {
      const order = await $fetch<{ status: string; type: string; toolId: string | null }>(`/api/promote/session/${sessionId}`, {
        headers: { 'x-user-token': token.value }
      }).catch(() => null)
      if (!alive) return
      if (route.query.paypal === '1' && order?.status === 'PAID') paypalResult.value = 'paid'
      if (route.query.paypal === '1' && order?.status === 'EXPIRED') paypalResult.value = 'failed'
      if (order?.type === 'advertise' && order.status === 'PAID') return navigateTo(localePath('/dashboard/advertise'))
      if (order?.toolId && order.type !== 'advertise') return navigateTo(localePath(`/dashboard/my-ais/${order.toolId}`))
      if (!order || order.status !== 'PENDING') return
      await new Promise(r => setTimeout(r, 2000))
    }
  })
}
