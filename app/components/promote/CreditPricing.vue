<script setup lang="ts">
import { CREDIT_PRICE, BULK_DISCOUNT, guestPost } from '~/data/promote'
import type { PaymentProvider } from '~/composables/usePromoteCheckout'

const { packages, strongNotes } = guestPost
defineProps<{ loading?: boolean; error?: string | null }>()

const { t, tp, list } = usePromoteText()
const noteParams = { price: `$${CREDIT_PRICE}`, min: BULK_DISCOUNT.minExclusive, percent: BULK_DISCOUNT.percent }
const notes = computed(() => list('promote.guestPost.notes', noteParams).map((text, i) => ({ text, strong: strongNotes.includes(i) })))

const emit = defineEmits<{ pay: [payload: { credits: number; amount: number; provider: PaymentProvider }] }>()
const providers = usePaymentProviders()

// 'custom' = hàng stepper (mặc định được chọn), hoặc số credits của gói có sẵn
const selected = ref<number | 'custom'>('custom')
const customCredits = ref(1)

const credits = computed(() => (selected.value === 'custom' ? customCredits.value : selected.value))
const subtotal = computed(() => credits.value * CREDIT_PRICE)
const hasDiscount = computed(() => credits.value > BULK_DISCOUNT.minExclusive)
const total = computed(() => (hasDiscount.value ? subtotal.value * (1 - BULK_DISCOUNT.percent / 100) : subtotal.value))

const usd = (n: number) => `$ ${n.toFixed(2)}`

function step(delta: number) {
  selected.value = 'custom'
  customCredits.value = Math.max(1, customCredits.value + delta)
}
function onInput(e: Event) {
  const v = parseInt((e.target as HTMLInputElement).value, 10)
  customCredits.value = Number.isFinite(v) && v > 0 ? v : 1
  selected.value = 'custom'
}
</script>

<template>
  <section class="pricing">
    <h2 class="pricing__title">{{ tp('promote.guestPost.title') }}</h2>
    <p class="pricing__sub">{{ t('promote.guestPost.sub') }}</p>
    <p class="pricing__rule">{{ t('promote.guestPost.rule') }}</p>

    <div class="rows" role="radiogroup" :aria-label="t('promote.guestPost.packagesLabel')">
      <button
        v-for="(p, i) in packages"
        :key="p"
        type="button"
        role="radio"
        :aria-checked="selected === p"
        class="row"
        :class="{ 'row--on': selected === p }"
        @click="selected = p"
      >
        <span class="row__name">{{ t('promote.guestPost.buy', p) }}</span>
        <span class="row__note">({{ list('promote.guestPost.packageNotes')[i] }})</span>
        <span class="row__price">{{ usd(p * CREDIT_PRICE) }} USD</span>
        <span class="radio" :class="{ 'radio--on': selected === p }" />
      </button>

      <div
        class="row row--custom"
        :class="{ 'row--on': selected === 'custom' }"
        role="radio"
        :aria-checked="selected === 'custom'"
        tabindex="0"
        @click="selected = 'custom'"
        @keydown.enter.space.prevent="selected = 'custom'"
      >
        <div class="stepper" @click.stop>
          <button type="button" class="stepper__btn" :aria-label="t('promote.guestPost.decrease')" :disabled="customCredits <= 1" @click="step(-1)">−</button>
          <input class="stepper__input" type="number" min="1" :value="customCredits" :aria-label="t('promote.guestPost.customCredits')" @input="onInput">
          <button type="button" class="stepper__btn" :aria-label="t('promote.guestPost.increase')" @click="step(1)">+</button>
        </div>
        <span class="row__price">{{ usd(customCredits * CREDIT_PRICE) }} USD</span>
        <span class="radio" :class="{ 'radio--on': selected === 'custom' }" />
      </div>
    </div>

    <p class="tip">
      {{ t('promote.guestPost.tip', { min: BULK_DISCOUNT.minExclusive, percent: BULK_DISCOUNT.percent }) }}
    </p>

    <button v-if="providers.paypal" type="button" class="pay pay--paypal" :disabled="loading" @click="emit('pay', { credits, amount: total, provider: 'paypal' })">
      {{ loading ? t('promote.processing') : t('promote.payPaypal', { amount: usd(total) }) }}
      <small v-if="hasDiscount" class="pay__old">{{ usd(subtotal) }}</small>
    </button>
    <button v-if="providers.stripe" type="button" class="pay" :disabled="loading" @click="emit('pay', { credits, amount: total, provider: 'stripe' })">
      {{ loading ? t('promote.processing') : t('promote.pay', { amount: usd(total) }) }}
      <small v-if="hasDiscount" class="pay__old">{{ usd(subtotal) }}</small>
    </button>

    <p v-if="error" class="p-error">{{ error }}</p>

    <ul class="benefits">
      <li v-for="b in list('promote.guestPost.benefits')" :key="b"><span class="check">✓</span>{{ b }}</li>
    </ul>

    <PromoteNoteBox :items="notes" />
  </section>
</template>

<style scoped>
.pricing {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 16px rgba(0, 0, 0, .06);
  padding: 32px clamp(16px, 8vw, 112px);
  margin-top: 24px;
  text-align: center;
}
.pricing__title { margin: 0 0 12px; font-size: 22px; font-weight: 700; }
.pricing__sub { margin: 0 0 8px; color: var(--p-primary); font-weight: 600; }
.pricing__rule { margin: 0 0 20px; font-size: 13px; color: var(--p-muted); }

.rows { display: flex; flex-direction: column; gap: 8px; text-align: left; }
.row {
  display: flex; align-items: center; gap: 16px;
  width: 100%; min-height: 56px; padding: 0 20px 0 40px;
  background: #f2f3f5; border: 0; border-radius: 2px;
  font: inherit; color: var(--p-text); cursor: pointer;
}
.row--on { background: var(--p-primary); color: #fff; }
.row__name { font-size: 18px; min-width: 150px; }
.row__note { font-size: 13px; opacity: .8; }
.row__price { margin-left: auto; font-size: 22px; }
.radio { flex: none; width: 18px; height: 18px; border-radius: 50%; background: #fff; position: relative; }
.radio--on::after { content: '✓'; position: absolute; inset: 0; display: grid; place-items: center; font-size: 12px; font-weight: 700; color: var(--p-primary); }

.stepper { display: flex; align-items: center; gap: 12px; }
.stepper__btn {
  width: 22px; height: 22px; border-radius: 50%;
  border: 1.5px solid currentColor; background: transparent; color: inherit;
  display: grid; place-items: center; line-height: 1; cursor: pointer; padding: 0;
}
.stepper__btn:disabled { opacity: .4; cursor: not-allowed; }
.stepper__input {
  width: 64px; text-align: center; font: inherit; font-size: 18px;
  background: transparent; border: 0; color: inherit; -moz-appearance: textfield;
}
.stepper__input::-webkit-inner-spin-button, .stepper__input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
.stepper__input:focus { outline: 1px dashed currentColor; }

.tip { margin: 14px 0 20px; font-size: 13px; color: #e5484d; text-align: left; }

.pay {
  width: 100%; height: 54px; border: 0; border-radius: 4px;
  background: var(--p-primary); color: #fff; font: inherit; font-size: 18px; font-weight: 700; cursor: pointer;
}
.pay:hover { background: var(--p-primary-dark); }
.pay:disabled { opacity: .6; cursor: not-allowed; }
.pay--paypal { background: #ffc439; color: #111; }
.pay + .pay { margin-top: 10px; }
.pay--paypal:hover { background: #f2ba36; }
.pay__old { margin-left: 8px; font-weight: 400; text-decoration: line-through; opacity: .7; }

.benefits { list-style: none; display: flex; flex-wrap: wrap; justify-content: center; gap: 8px 22px; padding: 0; margin: 22px 0; font-size: 14px; }
.check { display: inline-grid; place-items: center; width: 16px; height: 16px; margin-right: 6px; border-radius: 50%; background: var(--p-primary); color: #fff; font-size: 10px; }


@media (max-width: 640px) {
  .row { padding: 10px 14px; flex-wrap: wrap; gap: 4px 12px; }
  .row__name { min-width: 0; font-size: 16px; }
  .row__note { order: 3; width: 100%; }
  .row__price { font-size: 18px; }
}
</style>
