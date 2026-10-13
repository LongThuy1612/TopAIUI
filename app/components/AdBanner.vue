<script setup lang="ts">
import type { AdPlacement, AdSlot } from '~/types'

// A sponsored slot as a full-width banner (list pages other than home). Links straight
// to the advertiser through the click counter; data-ad-* lets useAdSlots count the
// impression. In a grid, give it col-span-full (and a grid-row-start, or a
// grid-flow-row-dense grid so the cards after it fill the row it leaves); in a divide-y list, wrap it in a div (the
// divider rule would strip its bottom border).
const props = defineProps<{ ad: AdSlot; placement: AdPlacement }>()

const { t } = useI18n()
const initials = computed(() => props.ad.tool.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'AI')
</script>

<template>
  <NuxtLinkLocale
    :to="ad.clickUrl"
    external
    target="_blank"
    rel="sponsored nofollow noopener"
    :data-ad-slot="ad.campaignId"
    :data-ad-placement="placement"
    :class="[
      'group relative mt-2 flex items-center gap-4 rounded-xl border bg-white px-4 py-3.5 transition-shadow hover:shadow-[0_12px_28px_-20px_rgba(23,18,26,.45)]',
      ad.tier === 'FEATURED' ? 'border-brand-300 ring-1 ring-brand-200' : 'border-ink-200'
    ]"
  >
    <span class="absolute -top-2.5 left-0 rounded bg-brand-50 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-brand-500">
      {{ t('sections.adLabel') }}
    </span>
    <div v-if="ad.tool.logoUrl" class="h-12 w-12 shrink-0 overflow-hidden rounded-lg">
      <img :src="sizedImage(ad.tool.logoUrl, 64, 64)" :alt="ad.tool.name" loading="lazy" class="h-full w-full object-cover">
    </div>
    <span v-else class="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-ink-900 text-base font-extrabold text-white">
      {{ initials }}
    </span>
    <div class="min-w-0 flex-1">
      <p class="truncate text-base font-semibold text-brand-500">{{ ad.tool.name }}</p>
      <p v-if="ad.tool.shortDesc" class="mt-0.5 line-clamp-2 text-sm text-ink-600 sm:line-clamp-1">{{ ad.tool.shortDesc }}</p>
    </div>
    <span class="shrink-0 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2 text-sm font-semibold text-white transition-opacity group-hover:opacity-90 sm:px-6 sm:py-2.5">
      {{ t('sections.tryNow') }}
    </span>
  </NuxtLinkLocale>
</template>
