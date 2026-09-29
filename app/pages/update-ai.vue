<script setup lang="ts">
import { updateAi } from '~/data/promote'
import type { ToolOption } from '~/composables/usePromoteCheckout'

const { t, tp, list, faqs } = usePromoteText()

useSeoMeta({ title: () => tp('promote.update.seoTitle'), description: () => tp('promote.update.seoDesc') })

const notes = computed(() => list('promote.update.notes').map((text, i) => ({ text, strong: updateAi.strongNotes.includes(i) })))

const tool = ref<ToolOption | null>(null)
const touched = ref(false)
const { checkout, loading, error } = usePromoteCheckout()

function pay() {
  touched.value = true
  if (!tool.value) return
  checkout({ type: 'update-ai', toolId: tool.value.id })
}
</script>

<template>
  <PromoteShell active="update" :faq-title="t('promote.update.faqTitle')" :faqs="faqs('promote.update.faqs')">
    <section class="p-panel p-panel--narrow">
      <h2 class="p-panel__title">{{ t('promote.update.panelTitle') }}</h2>

      <div class="p-field">
        <div class="p-label">
          <span><span class="req">*</span>{{ t('promote.form.tool') }}</span>
          <i18n-t keypath="promote.toolPicker.notListed" tag="small">
            <template #link><NuxtLink to="/submit">{{ t('promote.toolPicker.submitFirst') }}</NuxtLink></template>
          </i18n-t>
        </div>
        <PromoteToolPicker v-model="tool" :error="touched && !tool ? t('promote.form.selectTool') : ''" />
      </div>

      <div class="p-field">
        <div class="p-label">{{ t('promote.update.canUpdate') }}</div>
        <ul class="chips">
          <li v-for="(f, i) in list('promote.update.fields')" :key="f" :class="{ locked: updateAi.lockedFields.includes(i) }">
            {{ f }}
          </li>
        </ul>
      </div>

      <PromotePayBar :total="updateAi.price" :loading="loading" @pay="pay" />
      <p v-if="error" class="p-error">{{ error }}</p>

      <PromoteNoteBox :items="notes" />
    </section>
  </PromoteShell>
</template>

<style scoped>
.chips { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; }
.chips li { padding: 6px 12px; border-radius: 999px; background: var(--p-primary-soft); color: var(--p-primary-dark); font-size: 13px; }
.chips .locked { background: #f2f3f5; color: #999; text-decoration: line-through; }
</style>
