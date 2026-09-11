<script setup lang="ts">
const props = defineProps<{
  tool: { slug: string; name: string; logoUrl?: string }
}>()

const initials = computed(() => props.tool.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'AI')
</script>

<template>
  <NuxtLink :to="`/tools/${tool.slug}`" class="flex items-center gap-2.5 rounded-xl border border-ink-200 bg-white p-4 transition-colors hover:border-brand-500">
    <div v-if="tool.logoUrl" class="h-[26px] w-[26px] shrink-0 overflow-hidden rounded-lg">
      <img :src="tool.logoUrl" :alt="tool.name" class="h-full w-full object-cover">
    </div>
    <span v-else class="inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg bg-brand-100 text-xs font-extrabold text-brand-600">
      {{ initials }}
    </span>
    <div class="min-w-0">
      <h4 class="truncate text-base font-bold text-ink-900">{{ tool.name }}</h4>
    </div>
  </NuxtLink>
</template>
