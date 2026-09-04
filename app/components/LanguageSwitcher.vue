<script setup lang="ts">
const { locale, locales, setLocale } = useI18n()

const available = computed(() => locales.value)

function onChange(e: Event) {
  const target = e.target as HTMLSelectElement
  setLocale(target.value as 'en' | 'vi')
}
</script>

<template>
  <div class="relative">
    <select
      :value="locale"
      class="cursor-pointer appearance-none rounded-full border border-ink-200 bg-white py-1.5 pl-3 pr-7 text-xs font-semibold text-ink-600 outline-none transition hover:border-brand-300 focus:border-brand-400"
      @change="onChange"
    >
      <option v-for="loc in available" :key="loc.code" :value="loc.code">
        {{ loc.name }}
      </option>
    </select>
    <svg class="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  </div>
</template>
