<script setup lang="ts">
// Home sidebar: the categories with the most tools. Shown in place of AI News while
// there are no published articles yet (see AiNewsWidget's fallback slot).
const { t } = useI18n()
defineProps<{
  categories: { slug: string; name: string; icon: string; count: number }[]
}>()
</script>

<template>
  <div class="rounded-[18px] border border-ink-200 p-5">
    <div class="border-b border-ink-100 pb-3.5 text-base font-semibold text-ink-900">{{ t('sidebar.topCategories') }}</div>
    <ol class="flex flex-col gap-3.5 pt-3.5">
      <li v-for="(cat, i) in categories" :key="cat.slug">
        <NuxtLinkLocale :to="`/category/${cat.slug}`" class="grid grid-cols-[18px_minmax(0,1fr)] gap-2.5 text-base leading-[1.5] text-ink-900 hover:text-brand-500">
          <span :class="['font-semibold', i < 3 ? 'text-brand-500' : 'text-ink-400']">{{ i + 1 }}</span>
          <span class="min-w-0 truncate"><CategoryIcon :icon="cat.icon" /> {{ cat.name }} <span class="text-ink-500">({{ cat.count }})</span></span>
        </NuxtLinkLocale>
      </li>
    </ol>
    <div class="mt-4 border-t border-ink-100 pt-4 text-center">
      <NuxtLinkLocale to="/category/all" class="text-base font-bold text-brand-500 hover:text-brand-600">{{ t('sections.viewAll') }}</NuxtLinkLocale>
    </div>
  </div>
</template>
