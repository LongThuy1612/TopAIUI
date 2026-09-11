<script setup lang="ts">
const { t } = useI18n()
defineProps<{ tool?: { slug: string; name: string; shortDesc?: string | null } }>()
</script>

<template>
  <NuxtLink
    v-if="tool"
    :to="`/tools/${tool.slug}`"
    class="flex w-full flex-wrap items-center justify-center gap-3.5 bg-ink-900 px-5 py-[11px] text-center text-[13.5px] font-medium text-white hover:text-white"
  >
    <span class="rounded border border-brand-200/40 px-[7px] py-[2px] text-[10.5px] font-semibold uppercase tracking-[.14em] text-brand-200">
      {{ t('announcement.featured') }}
    </span>
    <span class="font-bold">{{ tool.name }}</span>
    <span v-if="tool.shortDesc" class="max-w-md truncate text-white/60">{{ tool.shortDesc }}</span>
    <span class="font-semibold text-brand-200">{{ t('announcement.cta') }} →</span>
  </NuxtLink>
</template>
