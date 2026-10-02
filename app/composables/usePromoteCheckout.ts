// Gửi đơn hàng của các trang promote tới API.
// Server trả về { orderId, checkoutUrl?, redirect? } — nếu có checkoutUrl thì chuyển sang cổng thanh toán,
// còn khi giả lập thanh toán (FAKE_PAYMENT) thì đi tới `redirect`.

export type ToolOption = { id: string | number; name: string; slug?: string; logo?: string }

export type PromoteOrder =
  | { type: 'submit-ai'; name: string; url: string; mode: 'auto' | 'manual' }
  | { type: 'advertise'; toolId: string | number; landingUrl?: string; clicks: number }
  | { type: 'guest-post'; credits: number }
  | { type: 'update-ai'; toolId: string | number }
  | { type: 'submit-gpt'; gptUrl: string }

export function usePromoteCheckout() {
  const route = useRoute()
  const { token, load } = useAuth()
  const { t } = useI18n()
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Chưa đăng nhập → sang trang login user, xong quay lại đúng trang này.
  const goLogin = () => navigateTo({ path: '/login', query: { redirect: route.path } })

  async function checkout(order: PromoteOrder) {
    load()
    if (!token.value) return goLogin()

    loading.value = true
    error.value = null
    try {
      const res = await $fetch<{ orderId: string; checkoutUrl?: string; redirect?: string }>('/api/promote/checkout', {
        method: 'POST',
        body: order,
        headers: { 'x-user-token': token.value },
      })
      if (res.checkoutUrl) {
        // Giữ loading cho tới khi trình duyệt rời trang sang Stripe.
        await navigateTo(res.checkoutUrl, { external: true })
        return
      }
      await navigateTo(res.redirect ?? `/orders?new=${res.orderId}`)
    } catch (e: any) {
      if (e?.statusCode === 401) return goLogin()
      error.value = e?.statusCode === 400 && e?.data?.message ? e.data.message : t('promote.genericError')
    }
    loading.value = false
  }

  return { checkout, loading, error }
}

export const isHttpUrl = (s: string) => {
  try {
    const u = new URL(s.trim())
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}
