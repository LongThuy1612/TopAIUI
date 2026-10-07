// The logged-in user's promote orders and credit balances (GET /api/orders),
// shared by the dashboard pages that show them: Payment & Invoice, Advertise
// AI, Posts / Links and My GPTs. One key, so moving between those pages reuses
// the same response instead of fetching it again.
export type OrderType = 'submit-ai' | 'advertise' | 'guest-post' | 'update-ai' | 'submit-gpt'
export type OrderStatus = 'PENDING' | 'PAID' | 'EXPIRED' | 'REFUNDED'

export interface OrderRow {
  id: string
  type: OrderType
  payload: Record<string, unknown>
  amount: number
  currency: string
  status: OrderStatus
  createdAt: string
  paidAt: string | null
}

export interface MyOrdersResponse {
  postCredits: number
  adClicks: number
  orders: OrderRow[]
}

export const orderStatusClass: Record<OrderStatus, string> = {
  PAID: 'bg-emerald-50 text-emerald-700',
  PENDING: 'bg-amber-50 text-amber-700',
  EXPIRED: 'bg-ink-100 text-ink-500',
  REFUNDED: 'bg-sky-50 text-sky-700'
}

export function useMyOrders() {
  const { authHeaders } = useAuth()
  return useFetch<MyOrdersResponse>('/api/orders', {
    key: 'my-orders',
    headers: authHeaders()
  })
}
