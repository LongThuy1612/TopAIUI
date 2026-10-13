<script setup lang="ts">
const { locale, locales } = useI18n()
const { switchLanguage, pending } = useSwitchLanguage()

const available = computed(() => locales.value)

async function onChange(e: Event) {
  const select = e.target as HTMLSelectElement
  // Not switched (blocked, or already switching): put the picker back on the
  // current language, or it would show a language the page isn't in.
  if (!(await switchLanguage(select.value))) select.value = pending.value ?? locale.value
}
</script>

<template>
  <div class="relative">
    <select
      :value="pending ?? locale"
      :disabled="!!pending"
      class="cursor-pointer appearance-none disabled:cursor-wait disabled:opacity-60 rounded-full border border-ink-200 bg-white py-1.5 pl-3 pr-7 text-xs font-semibold text-ink-600 outline-none transition hover:border-brand-300 focus:border-brand-400"
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
