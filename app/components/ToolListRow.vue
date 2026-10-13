<script setup lang="ts">
const props = defineProps<{
  tool: { slug: string; name: string; pricingType: 'FREE' | 'FREEMIUM' | 'PAID'; logoUrl?: string; shortDesc?: string | null; isAd?: boolean; tags?: { slug: string; name: string }[] }
  rank?: number
  categoryLabel?: string
  hoverGlow?: boolean
  // Sponsored slot: the row links straight to the advertiser (through the click counter)
  // and carries the Sponsor badge — otherwise it looks like any other row. A tool that
  // merely has a campaign, shown as an ordinary row, gets neither.
  href?: string
}>()

const { t } = useI18n()

const initials = computed(() => props.tool.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'AI')

const rankStyle = computed(() => {
  if (!props.rank) return 'text-ink-400'
  if (props.rank === 1) return 'text-amber-500'
  if (props.rank === 2) return 'text-ink-500'
  if (props.rank === 3) return 'text-amber-700'
  return 'text-ink-400'
})
</script>

<template>
  <NuxtLinkLocale
    :to="href ?? `/tools/${tool.slug}`"
    :external="!!href"
    :target="href ? '_blank' : undefined"
    :rel="href ? 'sponsored nofollow noopener' : undefined"
    :class="['group relative flex items-start gap-4 py-5', hoverGlow && '-mx-3 overflow-hidden rounded-[14px] px-3 transition-colors hover:bg-[#FDFAFB]']"
  >
    <img
      v-if="hoverGlow && tool.logoUrl"
      :src="sizedImage(tool.logoUrl, 112, 112)"
      alt=""
      loading="lazy"
      aria-hidden="true"
      class="pointer-events-none absolute -top-4 -right-4 h-28 w-28 rounded-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-[0.16]"
    >
    <template v-else-if="hoverGlow">
      <span class="pointer-events-none absolute -top-[18px] -right-[22px] h-32 w-32 rounded-full bg-brand-500 opacity-0 transition-opacity duration-300 group-hover:opacity-[0.06]"></span>
      <span class="pointer-events-none absolute top-2 right-0.5 text-[46px] font-extrabold tracking-[.02em] text-brand-500 opacity-0 transition-opacity duration-300 group-hover:opacity-[0.12]">{{ initials }}</span>
    </template>
    <span v-if="rank" :class="['relative w-5 shrink-0 pt-3.5 text-center text-sm font-bold', rankStyle]">{{ rank }}</span>
    <div v-if="tool.logoUrl" class="relative h-[52px] w-[52px] shrink-0 overflow-hidden rounded-[14px]">
      <img :src="sizedImage(tool.logoUrl, 64, 64)" :alt="tool.name" loading="lazy" class="h-full w-full object-cover">
    </div>
    <span
      v-else
      class="relative inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[14px] bg-brand-50 text-base font-extrabold text-brand-500"
    >
      {{ initials }}
    </span>
    <div class="relative min-w-0 flex-1">
      <div class="flex flex-wrap items-center gap-2">
        <h3 class="text-base font-semibold tracking-[-.01em] text-ink-900 group-hover:text-brand-500">{{ tool.name }}</h3>
        <span
          v-if="href"
          class="rounded-full border border-transparent bg-brand-500 px-2.5 py-[3px] text-[11px] font-semibold text-white"
        >{{ t('sections.sponsorBadge') }}</span>
        <span v-else-if="tool.pricingType === 'FREE'" class="rounded-full bg-ink-100 px-2.5 py-[3px] text-[11px] font-semibold text-ink-700">{{ t('pricing.FREE') }}</span>
      </div>
      <p v-if="tool.shortDesc" class="mt-1.5 mb-2.5 line-clamp-2 text-[14.5px] leading-[1.6] text-ink-800">{{ tool.shortDesc }}</p>
      <div v-if="tool.tags?.length" class="flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-ink-500">
        <span v-for="tag in tool.tags.slice(0, 5)":key="tag.slug">#{{ tag.name }}</span>
      </div>
      <span v-else-if="categoryLabel" class="text-xs text-ink-500">#{{ categoryLabel }}</span>
    </div>
  </NuxtLinkLocale>
</template>
