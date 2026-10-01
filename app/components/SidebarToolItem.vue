<script setup lang="ts">
const props = defineProps<{
  tool: { slug: string; name: string; logoUrl?: string; shortDesc?: string | null }
}>()

const initials = computed(() => props.tool.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'AI')
</script>

<template>
  <NuxtLink :to="`/tools/${tool.slug}`" class="relative block overflow-hidden rounded-[14px] border border-ink-200 bg-white p-4 transition hover:border-brand-200 hover:shadow-[0_10px_24px_-16px_rgba(23,18,26,.35)]">
    <img
      v-if="tool.logoUrl"
      :src="tool.logoUrl"
      alt=""
      aria-hidden="true"
      class="pointer-events-none absolute -top-3 -right-4 h-24 w-24 rounded-full object-cover opacity-[0.16]"
    >
    <template v-else>
      <span class="pointer-events-none absolute -top-[16px] -right-[20px] h-28 w-28 rounded-full bg-brand-500 opacity-[0.06]"></span>
      <span class="pointer-events-none absolute top-1.5 right-0.5 text-[40px] font-extrabold tracking-[.02em] text-brand-500 opacity-[0.12]">{{ initials }}</span>
    </template>
    <div class="relative flex items-center gap-2.5">
      <div v-if="tool.logoUrl" class="h-[26px] w-[26px] shrink-0 overflow-hidden rounded-lg">
        <img :src="tool.logoUrl" :alt="tool.name" class="h-full w-full object-cover">
      </div>
      <span v-else class="inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg bg-brand-50 text-xs font-extrabold text-brand-500">
        {{ initials }}
      </span>
      <h4 class="min-w-0 truncate text-[15.5px] font-semibold text-ink-900">{{ tool.name }}</h4>
    </div>
    <p v-if="tool.shortDesc" class="relative mt-[9px] line-clamp-2 text-[13.5px] leading-[1.55] text-ink-800">{{ tool.shortDesc }}</p>
  </NuxtLink>
</template>
