<script setup lang="ts">
const props = defineProps<{
  tool: { slug: string; name: string; logoUrl?: string }
}>()

const initials = computed(() => props.tool.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'AI')
</script>

<template>
  <NuxtLink :to="`/tools/${tool.slug}`" class="flex items-start gap-3 rounded-xl border border-ink-100 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md">
    <div v-if="tool.logoUrl" class="h-9 w-9 shrink-0 overflow-hidden rounded-lg">
      <img :src="tool.logoUrl" :alt="tool.name" class="h-full w-full object-cover">
    </div>
    <div v-else class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white">
      {{ initials }}
    </div>
    <div class="min-w-0">
      <h4 class="truncate text-sm font-semibold text-ink-900">{{ tool.name }}</h4>
    </div>
  </NuxtLink>
</template>
