<script setup lang="ts">
import { submitGpt } from '~/data/promote'
import { isHttpUrl } from '~/composables/usePromoteCheckout'

const { t, tp, faqs } = usePromoteText()

useSeoMeta({ title: () => tp('promote.submitGpt.seoTitle'), description: () => tp('promote.submitGpt.seoDesc') })

const gptUrl = ref('')
const touched = ref(false)
// Link GPT dạng https://chatgpt.com/g/g-xxxx hoặc https://chat.openai.com/g/g-xxxx
const err = computed(() => {
  const v = gptUrl.value.trim()
  if (!v) return t('promote.submitGpt.required')
  if (!isHttpUrl(v) || !/\/g\/g-[\w-]+/.test(v)) return t('promote.submitGpt.invalid', { example: 'https://chatgpt.com/g/g-abc123-my-gpt' })
  return ''
})

const { checkout, loading, error } = usePromoteCheckout()
function pay() {
  touched.value = true
  if (err.value) return
  checkout({ type: 'submit-gpt', gptUrl: gptUrl.value.trim() })
}
</script>

<template>
  <PromoteShell active="submit-gpt" :faq-title="t('promote.submitGpt.faqTitle')" :faqs="faqs('promote.submitGpt.faqs')">
    <section class="p-panel p-panel--narrow">
      <h2 class="p-panel__title">{{ t('promote.submitGpt.panelTitle') }}</h2>
      <div class="p-field">
        <label class="p-label" for="gpt"><span><span class="req">*</span>{{ t('promote.submitGpt.label') }}</span></label>
        <input id="gpt" v-model="gptUrl" class="p-input" :class="{ 'p-input--error': touched && err }" placeholder="https://chatgpt.com/g/g-...">
        <p v-if="touched && err" class="p-error">{{ err }}</p>
        <p v-else class="p-hint">{{ t('promote.submitGpt.hint') }}</p>
      </div>
      <PromotePayBar :total="submitGpt.price" :note="t('promote.eta')" :loading="loading" @pay="pay" />
      <p v-if="error" class="p-error">{{ error }}</p>
    </section>
  </PromoteShell>
</template>
