<script setup lang="ts">
// Ô tìm & chọn tool đã có trong directory. Gọi GET /api/promote/tools?q=
import type { ToolOption } from '~/composables/usePromoteCheckout'

const model = defineModel<ToolOption | null>({ default: null })
defineProps<{ error?: string }>()
const { t } = useI18n()

const query = ref(model.value?.name ?? '')
const results = ref<ToolOption[]>([])
const open = ref(false)
const loading = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

function onInput() {
  model.value = null
  clearTimeout(timer)
  const q = query.value.trim()
  if (q.length < 2) { results.value = []; open.value = false; return }
  timer = setTimeout(async () => {
    loading.value = true
    try {
      results.value = await $fetch<ToolOption[]>('/api/promote/tools', { query: { q } })
      open.value = true
    } catch {
      results.value = []
    } finally {
      loading.value = false
    }
  }, 250)
}

function pick(t: ToolOption) {
  model.value = t
  query.value = t.name
  open.value = false
}
function close() { setTimeout(() => (open.value = false), 150) }
</script>

<template>
  <div class="picker">
    <input
      v-model="query"
      class="p-input"
      :class="{ 'p-input--error': error }"
      :placeholder="t('promote.toolPicker.placeholder')"
      autocomplete="off"
      role="combobox"
      :aria-expanded="open"
      @input="onInput"
      @focus="results.length && (open = true)"
      @blur="close"
    >
    <ul v-if="open" class="picker__list" role="listbox">
      <li v-if="loading" class="picker__empty">{{ t('promote.toolPicker.searching') }}</li>
      <i18n-t v-else-if="!results.length" keypath="promote.toolPicker.notFound" tag="li" class="picker__empty">
        <template #link><NuxtLinkLocale to="/submit">{{ t('promote.toolPicker.submitFirst') }}</NuxtLinkLocale></template>
      </i18n-t>
      <template v-else>
        <li v-for="item in results" :key="item.id" role="option" class="picker__item" @mousedown.prevent="pick(item)">
          <img v-if="item.logo" :src="item.logo" alt="" width="20" height="20">
          {{ item.name }}
        </li>
      </template>
    </ul>
    <p v-if="error" class="p-error">{{ error }}</p>
  </div>
</template>

<style scoped>
.picker { position: relative; }
.picker__list {
  position: absolute; z-index: 10; left: 0; right: 0; top: 44px; margin: 0; padding: 4px 0; list-style: none;
  background: #fff; border: 1px solid var(--p-border); border-radius: 6px; box-shadow: 0 8px 24px rgba(0, 0, 0, .08);
  max-height: 260px; overflow: auto;
}
.picker__item { display: flex; align-items: center; gap: 8px; padding: 8px 14px; cursor: pointer; font-size: 14px; }
.picker__item:hover { background: var(--p-primary-soft); }
.picker__item img { border-radius: 4px; }
.picker__empty { padding: 8px 14px; font-size: 13px; color: var(--p-muted); }
.picker__empty a { color: var(--p-primary); }
</style>
