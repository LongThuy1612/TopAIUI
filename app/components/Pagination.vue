<script setup lang="ts">
const props = defineProps<{ page: number; pageCount: number }>()
const emit = defineEmits<{ (e: 'update:page', v: number): void }>()

const pages = computed(() => {
  const total = props.pageCount
  const current = props.page
  const range: (number | '…')[] = []
  const around = 1
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - around && i <= current + around)) {
      range.push(i)
    } else if (range[range.length - 1] !== '…') {
      range.push('…')
    }
  }
  return range
})
</script>

<template>
  <nav v-if="pageCount > 1" class="mt-10 flex items-center justify-center gap-1.5">
    <button
      class="rounded-lg border border-ink-200 px-3 py-1.5 text-sm font-medium text-ink-600 transition hover:border-brand-300 hover:text-brand-700 disabled:opacity-40 disabled:hover:border-ink-200 disabled:hover:text-ink-600"
      :disabled="page <= 1"
      @click="emit('update:page', page - 1)"
    >
      Prev
    </button>
    <template v-for="(p, i) in pages" :key="i">
      <span v-if="p === '…'" class="px-2 text-sm text-ink-400">…</span>
      <button
        v-else
        :class="[
          'min-w-[2.25rem] rounded-lg border px-3 py-1.5 text-sm font-medium transition',
          p === page ? 'border-brand-500 bg-brand-500 text-white' : 'border-ink-200 text-ink-600 hover:border-brand-300 hover:text-brand-700'
        ]"
        @click="emit('update:page', p as number)"
      >
        {{ p }}
      </button>
    </template>
    <button
      class="rounded-lg border border-ink-200 px-3 py-1.5 text-sm font-medium text-ink-600 transition hover:border-brand-300 hover:text-brand-700 disabled:opacity-40 disabled:hover:border-ink-200 disabled:hover:text-ink-600"
      :disabled="page >= pageCount"
      @click="emit('update:page', page + 1)"
    >
      Next
    </button>
  </nav>
</template>
