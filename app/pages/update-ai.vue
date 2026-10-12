<script setup lang="ts">
import { updateAi } from '~/data/promote'

const { t, tp, list, faqs } = usePromoteText()

useSeoMeta({ title: () => tp('promote.update.seoTitle'), description: () => tp('promote.update.seoDesc') })

const notes = computed(() => list('promote.update.notes').map((text, i) => ({ text, strong: updateAi.strongNotes.includes(i) })))

// Only the owner can update a tool: pick one of your own published tools
// (?toolId= preselects it, e.g. from the tool's page in My AIs).
const route = useRoute()
const { token, load } = useAuth()
const myTools = ref<{ id: string; name: string }[]>([])
const loggedIn = ref(true)
const toolId = ref(typeof route.query.toolId === 'string' ? route.query.toolId : '')
onMounted(async () => {
  load()
  if (!token.value) { loggedIn.value = false; return }
  const res = await $fetch<{ items: { id: string; name: string; status: string }[] }>('/api/me/tools', {
    headers: { 'x-user-token': token.value }
  }).catch(() => ({ items: [] }))
  myTools.value = res.items.filter(t => t.status === 'PUBLISHED').map(t => ({ id: t.id, name: t.name }))
  if (!myTools.value.some(t => t.id === toolId.value)) toolId.value = ''
})

const touched = ref(false)
const { checkout, loading, error } = usePromoteCheckout()

// Back from Stripe: go to the tool, where the update form is waiting.
useStripeReturn()

function pay() {
  touched.value = true
  if (!toolId.value) return
  checkout({ type: 'update-ai', toolId: toolId.value })
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
            <template #link><NuxtLinkLocale to="/submit">{{ t('promote.toolPicker.submitFirst') }}</NuxtLinkLocale></template>
          </i18n-t>
        </div>
        <p v-if="!loggedIn" class="p-hint">
          <NuxtLinkLocale :to="{ path: '/login', query: { redirect: route.fullPath } }">{{ t('promote.update.loginToPick') }}</NuxtLinkLocale>
        </p>
        <p v-else-if="!myTools.length" class="p-hint">{{ t('promote.update.noOwnedTools') }}</p>
        <select v-else v-model="toolId" class="p-input" :class="{ 'p-input--error': touched && !toolId }">
          <option value="">{{ t('promote.update.pickOwnTool') }}</option>
          <option v-for="o in myTools" :key="o.id" :value="o.id">{{ o.name }}</option>
        </select>
        <p v-if="touched && !toolId && loggedIn" class="p-error">{{ t('promote.form.selectTool') }}</p>
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
.p-hint { margin: 0; font-size: 14px; color: var(--p-muted); }
.chips { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; }
.chips li { padding: 6px 12px; border-radius: 999px; background: var(--p-primary-soft); color: var(--p-primary-dark); font-size: 13px; }
.chips .locked { background: #f2f3f5; color: #999; text-decoration: line-through; }
</style>
