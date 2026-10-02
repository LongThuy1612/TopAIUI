<script setup lang="ts">
defineProps<{
  options: { value: string; label: string; count?: number }[]
  active: string
}>()

defineEmits<{ select: [value: string] }>()

// Formatted in the UI locale so server and client render the same digits.
const { locale } = useI18n()
</script>

<template>
  <div class="mt-6 flex flex-wrap gap-2">
    <button
      v-for="o in options"
      :key="o.value"
      type="button"
      :class="[
        'rounded-full border px-4 py-1.5 text-sm font-semibold transition',
        active === o.value ? 'border-brand-500 bg-brand-500 text-white' : 'border-ink-200 text-ink-600 hover:border-brand-300'
      ]"
      @click="$emit('select', o.value)"
    >
      {{ o.label }}
      <span v-if="o.count != null" :class="['ml-1 text-xs font-medium', active === o.value ? 'text-white/80' : 'text-ink-400']">{{ o.count.toLocaleString(locale) }}</span>
    </button>
  </div>
</template>
