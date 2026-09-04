<script setup lang="ts">
const { t } = useI18n()
defineProps<{
  categories: { slug: string; name: string; icon: string; count: number }[]
}>()
</script>

<template>
  <div class="rounded-xl border border-ink-100 bg-white p-4">
    <h3 class="text-sm font-bold text-ink-900">📊 {{ t('sidebar.topCategories') }}</h3>
    <ol class="mt-3 space-y-3">
      <li v-for="(cat, i) in categories" :key="cat.slug" class="flex items-start gap-2.5">
        <span class="w-4 shrink-0 pt-0.5 text-xs font-bold text-brand-500">{{ i + 1 }}</span>
        <NuxtLink :to="`/category/${cat.slug}`" class="min-w-0 flex-1 truncate text-xs leading-relaxed text-ink-600 hover:text-brand-600">
          {{ cat.icon }} {{ cat.name }} <span class="text-ink-400">({{ cat.count }})</span>
        </NuxtLink>
      </li>
    </ol>
  </div>
</template>
