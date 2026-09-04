<script setup lang="ts">
const { t } = useI18n()
defineProps<{ tool?: { slug: string; name: string } }>()
</script>

<template>
  <div v-if="tool" class="flex items-center justify-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-2 text-center text-sm font-medium text-white">
    <span class="hidden sm:inline">{{ t('announcement.featured') }}</span>
    <NuxtLink :to="`/tools/${tool.slug}`" class="inline-flex max-w-full items-center gap-1.5 truncate rounded-full bg-white/15 px-3 py-1 font-semibold transition hover:bg-white/25">
      <span class="truncate">{{ tool.name }}</span>
      <svg class="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
      </svg>
    </NuxtLink>
  </div>
</template>
