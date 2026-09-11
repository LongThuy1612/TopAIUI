<script setup lang="ts">
const { t } = useI18n()
defineProps<{ tool?: { slug: string; name: string } }>()
</script>

<template>
  <div
    v-if="tool"
    class="flex flex-wrap items-center justify-center gap-2 px-5 py-3 text-center text-sm font-semibold text-white"
    style="background: linear-gradient(90deg, #9f1239 0%, #db2777 55%, #ec4899 100%)"
  >
    <span class="opacity-85">{{ t('announcement.featured') }}</span>
    <NuxtLink :to="`/tools/${tool.slug}`" class="inline-flex max-w-full items-center gap-1.5 truncate rounded-full bg-white/20 px-3 py-1 font-bold transition hover:bg-white/30">
      <span class="truncate">{{ tool.name }}</span>
      <svg class="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
      </svg>
    </NuxtLink>
  </div>
</template>
