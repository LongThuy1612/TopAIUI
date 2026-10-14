// Ends PayPal Research Plans the customer cancelled once their paid period is over, gives
// up approvals never finished (server/utils/paypalSubscriptions.ts) and expires promote
// orders never paid (server/utils/paypal.ts). Scheduled
// nightly in nuxt.config.ts; in dev run it by hand via /_nitro/tasks/research:paypal-cleanup.
export default defineTask({
  meta: { name: 'research:paypal-cleanup', description: 'End cancelled PayPal Research Plans, expire unpaid PayPal orders' },
  async run() {
    if (!isPaypalConfigured()) return { result: { cancelled: 0, expired: 0, expiredOrders: 0, refundsRetried: 0, skipped: true } }
    return { result: { ...await cleanUpPaypalSubscriptions(), skipped: false } }
  }
})
