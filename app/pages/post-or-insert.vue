<script setup lang="ts">
import { BULK_DISCOUNT } from '~/data/promote'
import type { PaymentProvider } from '~/composables/usePromoteCheckout'

const { t, tp, faqs } = usePromoteText()

useSeoMeta({
  title: () => tp('promote.guestPost.seoTitle'),
  description: () => tp('promote.guestPost.seoDesc'),
})

const faqParams = { min: BULK_DISCOUNT.minExclusive, percent: BULK_DISCOUNT.percent }

const { checkout, loading, error } = usePromoteCheckout()
const onPay = ({ credits, provider }: { credits: number; provider: PaymentProvider }) => checkout({ type: 'guest-post', credits }, provider)
// Back from PayPal: captures the payment (Stripe needs nothing more).
useStripeReturn()
</script>

<template>
  <PromoteShell active="guest-post" :faq-title="t('promote.guestPost.faqTitle')" :faqs="faqs('promote.guestPost.faqs', faqParams)">
    <PromoteCreditPricing :loading="loading" :error="error" @pay="onPay" />
  </PromoteShell>
</template>
