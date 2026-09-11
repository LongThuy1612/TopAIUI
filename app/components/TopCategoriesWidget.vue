<script setup lang="ts">
const { t } = useI18n()
defineProps<{
  categories: { slug: string; name: string; icon: string; count: number }[]
}>()
</script>

<template>
  <div class="rounded-[14px] border border-ink-200 p-[18px]">
    <div class="flex items-center gap-2.5">
      <span class="inline-flex h-6 w-6 items-center justify-center rounded-[7px] bg-brand-100 text-xs font-extrabold text-brand-600">📊</span>
      <span class="text-[17px] font-extrabold text-ink-900">{{ t('sidebar.topCategories') }}</span>
    </div>
    <ol class="flex flex-col gap-3.5 pt-4">
      <li v-for="(cat, i) in categories" :key="cat.slug">
        <NuxtLink :to="`/category/${cat.slug}`" class="grid grid-cols-[20px_minmax(0,1fr)] gap-2.5 text-sm leading-normal text-ink-800 hover:text-brand-500">
          <span class="font-extrabold text-ink-500">{{ i + 1 }}</span>
          <span class="min-w-0 truncate"><CategoryIcon :icon="cat.icon" /> {{ cat.name }} <span class="text-ink-500">({{ cat.count }})</span></span>
        </NuxtLink>
      </li>
    </ol>
    <div class="pt-4 text-center">
      <NuxtLink to="/category/all" class="text-sm font-bold text-brand-500 hover:text-brand-600">{{ t('sections.viewAll') }}</NuxtLink>
    </div>
  </div>
</template>
