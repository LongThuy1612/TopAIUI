<script setup lang="ts">
import type { ArticlesResponse } from '~/types'

const { t } = useI18n()

// Latest published articles (/ai-news). Until there is one, the default slot shows instead
// (the home page puts Top Categories there).
const { data } = await useFetch<ArticlesResponse>('/api/articles', { query: { limit: 10 }, key: 'ai-news-widget' })
const news = computed(() => data.value?.items ?? [])
</script>

<template>
  <div v-if="news.length" class="rounded-[18px] border border-ink-200 p-5">
    <div class="border-b border-ink-100 pb-3.5 text-base font-semibold text-ink-900">{{ t('sidebar.aiNews') }}</div>
    <div class="flex flex-col gap-3.5 pt-3.5">
      <AiNewsLink
        v-for="(item, i) in news"
        :key="item.slug"
        :item="item"
        class="grid grid-cols-[18px_minmax(0,1fr)] gap-2.5 text-base leading-[1.5] text-ink-900 hover:text-brand-500"
      >
        <span :class="['font-semibold', i < 3 ? 'text-brand-500' : 'text-ink-400']">{{ i + 1 }}</span>
        <span>{{ item.title }}<span v-if="item.externalUrl" class="text-ink-400"> ↗</span></span>
      </AiNewsLink>
    </div>
    <div class="mt-4 border-t border-ink-100 pt-4 text-center">
      <NuxtLink to="/ai-news" class="text-base font-bold text-brand-500 hover:text-brand-600">{{ t('sidebar.readMoreNews') }} →</NuxtLink>
    </div>
  </div>
  <slot v-else />
</template>
