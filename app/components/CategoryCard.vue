<script setup lang="ts">
defineProps<{
  category: { slug: string; name: string; icon: string; count: number }
  active?: boolean
}>()
</script>

<template>
  <NuxtLinkLocale
    :to="`/category/${category.slug}`"
    :class="[
      'flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm transition',
      active ? 'border-brand-300 bg-brand-50 font-semibold text-brand-700' : 'border-ink-100 text-ink-600 hover:border-brand-200 hover:text-brand-700'
    ]"
  >
    <span class="flex items-center gap-2 truncate">
      <CategoryIcon :icon="category.icon" />
      <span class="truncate">{{ category.name }}</span>
    </span>
    <span class="shrink-0 text-xs text-ink-400">{{ category.count }}</span>
  </NuxtLinkLocale>
</template>
