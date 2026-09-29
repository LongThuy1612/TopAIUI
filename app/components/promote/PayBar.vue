<script setup lang="ts">
withDefaults(defineProps<{ total: number | null; note?: string; loading?: boolean; disabled?: boolean }>(), {
  note: '', loading: false, disabled: false,
})
defineEmits<{ pay: [] }>()

const { t } = useI18n()
const fmt = (n: number) => (Number.isInteger(n) ? `$ ${n}` : `$ ${n.toFixed(2)}`)
</script>

<template>
  <div class="paybar">
    <div class="paybar__info">
      <slot name="before" />
      <div class="paybar__total">{{ t('promote.total', { amount: total == null ? '$ --' : fmt(total) }) }}</div>
      <p v-if="note" class="paybar__note">{{ note }}</p>
      <slot name="after" />
    </div>
    <button type="button" class="p-btn" :disabled="disabled || loading || total == null" @click="$emit('pay')">
      {{ loading ? t('promote.processing') : t('promote.pay', { amount: total == null ? '$' : fmt(total) }) }}
    </button>
  </div>
</template>

<style scoped>
.paybar {
  display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
  background: #f6f7f9; padding: 28px clamp(16px, 5vw, 56px); margin-top: 8px;
}
.paybar__total { font-size: 30px; font-weight: 700; }
.paybar__note { margin: 6px 0 0; font-size: 13px; color: var(--p-muted); }
</style>
