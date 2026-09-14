<script setup lang="ts">
const props = withDefaults(defineProps<{ modelValue?: string; placeholder?: string; dense?: boolean }>(), {
  modelValue: '',
  placeholder: 'Search AI tools...',
  dense: false
})
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void; (e: 'submit', v: string): void }>()

const value = ref(props.modelValue)
watch(() => props.modelValue, (v) => { value.value = v })

function onSubmit() {
  emit('update:modelValue', value.value)
  emit('submit', value.value)
}
</script>

<template>
  <form
    v-if="dense"
    class="relative w-full"
    @submit.prevent="onSubmit"
  >
    <svg class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35m1.35-5.15a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z" />
    </svg>
    <input
      v-model="value"
      type="text"
      :placeholder="placeholder"
      class="w-full rounded-full border border-ink-200 bg-white py-2 pl-9 pr-4 text-sm text-ink-900 shadow-sm outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
    >
  </form>
  <form
    v-else
    class="mx-auto flex max-w-[660px] items-center gap-3 rounded-2xl border border-ink-300 bg-white py-[7px] pl-[18px] pr-[7px] shadow-[0_1px_2px_rgba(23,18,26,.04),0_12px_32px_-12px_rgba(190,24,93,.18)] transition focus-within:border-brand-300"
    @submit.prevent="onSubmit"
  >
    <svg class="h-5 w-5 shrink-0 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.25">
      <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35m1.35-5.15a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z" />
    </svg>
    <input
      v-model="value"
      type="text"
      :placeholder="placeholder"
      class="min-w-0 flex-1 bg-transparent py-[13px] text-base text-ink-900 outline-none"
    >
    <button type="submit" class="flex-none cursor-pointer rounded-[11px] bg-brand-500 px-[26px] py-[13px] text-[15px] font-bold text-white transition-colors hover:bg-brand-600">
      Search
    </button>
  </form>
</template>
