<script setup lang="ts">
import type { GptCardData } from '~/types'

// One GPT in the /gpts grid and in "Related GPTs".
defineProps<{ gpt: GptCardData }>()
const { t } = useI18n()
const initials = (name: string) => name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'G'
</script>

<template>
  <NuxtLink
    :to="`/gpts/${gpt.slug}`"
    class="group flex h-full flex-col rounded-2xl border border-ink-200 bg-white p-5 transition hover:border-brand-200 hover:shadow-sm"
  >
    <div class="flex items-center gap-3">
      <img v-if="gpt.iconUrl" :src="gpt.iconUrl" :alt="gpt.name" loading="lazy" class="h-12 w-12 shrink-0 rounded-full object-cover">
      <span v-else class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-extrabold text-brand-500">{{ initials(gpt.name) }}</span>
      <div class="min-w-0">
        <div class="truncate font-bold text-ink-900 group-hover:text-brand-600">{{ gpt.name }}</div>
        <div class="truncate text-xs text-ink-400">
          <template v-if="gpt.author">{{ t('gpts.by', { name: gpt.author }) }} · </template>{{ t(`gpts.categories.${gpt.category}`) }}
        </div>
      </div>
    </div>
    <p class="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-600">{{ gpt.description }}</p>
  </NuxtLink>
</template>
