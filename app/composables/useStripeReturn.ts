// After Stripe sends the buyer back (?session_id=…), wait until the order is fulfilled
// and then go to the tool it created / updates (/dashboard/my-ais/:id), or for an ad
// order to the campaign list (/dashboard/advertise). Stops polling
// once the page is left, so a late answer never navigates the buyer from elsewhere.
export function useStripeReturn() {
  const route = useRoute()
  const localePath = useLocalePath()
  const { token, load } = useAuth()
  let alive = true
  onBeforeUnmount(() => { alive = false })
  onMounted(async () => {
    const sessionId = route.query.session_id
    if (typeof sessionId !== 'string') return
    load()
    if (!token.value) return
    for (let i = 0; i < 15 && alive; i++) {
      const order = await $fetch<{ status: string; type: string; toolId: string | null }>(`/api/promote/session/${sessionId}`, {
        headers: { 'x-user-token': token.value }
      }).catch(() => null)
      if (!alive) return
      if (order?.type === 'advertise' && order.status === 'PAID') return navigateTo(localePath('/dashboard/advertise'))
      if (order?.toolId && order.type !== 'advertise') return navigateTo(localePath(`/dashboard/my-ais/${order.toolId}`))
      if (!order || order.status === 'EXPIRED') return
      await new Promise(r => setTimeout(r, 2000))
    }
  })
}
