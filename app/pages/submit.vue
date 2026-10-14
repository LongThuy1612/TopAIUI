<script setup lang="ts">
import { submitAi } from '~/data/promote'
import { isHttpUrl, type PaymentProvider } from '~/composables/usePromoteCheckout'

const { t, tp, items, faqs } = usePromoteText()

useSeoMeta({
  title: () => tp('promote.submit.seoTitle'),
  description: () => tp('promote.submit.seoDesc'),
})

const form = reactive({ name: '', url: '', mode: 'auto' as 'auto' | 'manual' })
const touched = ref(false)
const errors = computed(() => ({
  name: form.name.trim() ? '' : t('promote.submit.nameRequired'),
  url: !form.url.trim() ? t('promote.submit.urlRequired') : isHttpUrl(form.url) ? '' : t('promote.submit.urlInvalid', { example: 'https://example.ai' }),
}))
const valid = computed(() => !errors.value.name && !errors.value.url)

const { checkout, loading, error } = usePromoteCheckout()

// Back from Stripe: go straight to the new tool once the order is fulfilled.
useStripeReturn()

function pay(provider: PaymentProvider) {
  touched.value = true
  if (!valid.value) return
  checkout({ type: 'submit-ai', name: form.name.trim(), url: form.url.trim(), mode: form.mode }, provider)
}
</script>

<template>
  <PromoteShell active="submit" :faq-title="t('promote.submit.faqTitle')" :faqs="faqs('promote.submit.faqs')">
    <section class="p-panel p-panel--narrow">
      <h2 class="p-panel__title">{{ t('promote.submit.panelTitle') }}</h2>

      <div class="p-field">
        <label class="p-label" for="tool-name"><span><span class="req">*</span>{{ t('promote.submit.name') }}</span></label>
        <input id="tool-name" v-model="form.name" class="p-input" :class="{ 'p-input--error': touched && errors.name }" :placeholder="t('promote.submit.namePlaceholder')">
        <p v-if="touched && errors.name" class="p-error">{{ errors.name }}</p>
      </div>

      <div class="p-field">
        <label class="p-label" for="tool-url"><span><span class="req">*</span>{{ t('promote.submit.url') }}</span></label>
        <input id="tool-url" v-model="form.url" type="url" class="p-input" :class="{ 'p-input--error': touched && errors.url }" placeholder="https://example.ai">
        <p v-if="touched && errors.url" class="p-error">{{ errors.url }}</p>
      </div>

      <div class="p-field">
        <div class="p-label"><span><span class="req">*</span>{{ t('promote.submit.whoWrites') }}</span></div>
        <div class="modes" role="radiogroup">
          <label v-for="m in submitAi.modes" :key="m" class="mode" :class="{ 'mode--on': form.mode === m }">
            <input v-model="form.mode" type="radio" name="mode" :value="m" class="sr-only">
            <strong>{{ tp(`promote.submit.modes.${m}.title`) }}</strong>
            <span>{{ t(`promote.submit.modes.${m}.desc`) }}</span>
          </label>
        </div>
      </div>

      <PromotePayBar :total="submitAi.price" :note="t('promote.eta')" :loading="loading" @pay="pay" />
      <p v-if="error" class="p-error">{{ error }}</p>
    </section>

    <section class="p-panel example">
      <div class="example__mock" aria-hidden="true">
        <div class="ghost" />
        <div class="mock-card">
          <div class="mock-card__head"><span class="mock-logo">E</span>Example AI</div>
          <p>{{ t('promote.submit.mockDesc') }}</p>
        </div>
        <div class="ghost" />
      </div>
      <div>
        <h2 class="example__title">{{ t('promote.submit.includesTitle') }}</h2>
        <p class="example__lead">{{ t('promote.submit.youGetLead') }}</p>
        <PromoteChecklist :items="items('promote.submit.youGet')" />
      </div>
    </section>
  </PromoteShell>
</template>

<style scoped>
.modes { display: grid; gap: 12px; }
.mode {
  display: grid; gap: 6px; padding: 14px 16px; border: 1px solid var(--p-border); border-radius: 4px; cursor: pointer;
}
.mode strong { font-weight: 500; font-size: 16px; }
.mode span { font-size: 13px; color: var(--p-muted); }
.mode--on { border-color: var(--p-primary); background: var(--p-primary-soft); }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }

.example { display: grid; grid-template-columns: 2fr 3fr; gap: 32px; padding: 32px; }
.example__title { margin: 0 0 16px; font-size: 22px; }
.example__lead { margin: 0 0 14px; }
.example__mock { background: #f0f0f4; border-radius: 12px; padding: 24px; display: grid; gap: 14px; align-content: center; }
.ghost { height: 56px; margin: 0 40px; border-radius: 6px; background: #fff; opacity: .7; }
.mock-card { background: #fff; border: 2px solid #c9bdf7; border-radius: 8px; padding: 14px 16px; margin: 0 20px; }
.mock-card__head { display: flex; align-items: center; gap: 10px; font-weight: 700; margin-bottom: 8px; }
.mock-card p { margin: 0; font-size: 13px; color: var(--p-muted); }
.mock-logo { width: 24px; height: 24px; border-radius: 6px; background: var(--p-primary); color: #fff; display: grid; place-items: center; font-size: 13px; }
@media (max-width: 800px) { .example { grid-template-columns: 1fr; } }
</style>
