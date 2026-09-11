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
    class="mx-auto flex max-w-[640px] items-center gap-2.5 rounded-[14px] border border-ink-200 bg-white p-2 shadow-[0_6px_18px_rgba(76,5,25,.06)] transition focus-within:border-brand-300 focus-within:ring-2 focus-within:ring-brand-50"
    @submit.prevent="onSubmit"
  >
    <input
      v-model="value"
      type="text"
      :placeholder="placeholder"
      class="min-w-0 flex-1 bg-transparent px-3.5 py-3 text-base text-ink-900 outline-none"
    >
    <button type="submit" class="flex-none cursor-pointer rounded-[10px] bg-brand-500 px-6 py-3 text-[15px] font-bold text-white transition-colors hover:bg-brand-600">
      Search
    </button>
  </form>
</template>
