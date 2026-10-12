<script setup lang="ts">
defineProps<{ category: { slug: string; name: string; icon: string } }>()
</script>

<template>
  <NuxtLinkLocale
    :to="`/category/${category.slug}`"
    class="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-ink-200 bg-white px-4 py-2 text-sm font-medium text-ink-700 shadow-sm transition hover:border-brand-300 hover:text-brand-700 hover:shadow"
  >
    <CategoryIcon :icon="category.icon" />
    <span>{{ category.name }}</span>
  </NuxtLinkLocale>
</template>
