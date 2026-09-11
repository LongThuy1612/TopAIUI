<script setup lang="ts">
const props = defineProps<{
  tool: { slug: string; name: string; pricingType: 'FREE' | 'FREEMIUM' | 'PAID'; logoUrl?: string; shortDesc?: string | null; isAd?: boolean; tags?: { slug: string; name: string }[] }
  rank?: number
  categoryLabel?: string
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
  <NuxtLink :to="`/tools/${tool.slug}`" class="group flex items-start gap-4 py-5">
    <span v-if="rank" :class="['w-5 shrink-0 pt-3.5 text-center text-sm font-bold', rankStyle]">{{ rank }}</span>
    <div v-if="tool.logoUrl" class="h-[52px] w-[52px] shrink-0 overflow-hidden rounded-[14px]">
      <img :src="tool.logoUrl" :alt="tool.name" class="h-full w-full object-cover">
    </div>
    <span
      v-else
      class="inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[14px] text-base font-extrabold"
      :class="tool.isAd ? 'bg-ink-900 text-white' : 'bg-brand-50 text-brand-500'"
    >
      {{ initials }}
    </span>
    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-center gap-2">
        <h3 class="text-[17px] font-extrabold tracking-[-.01em] text-ink-900 group-hover:text-brand-500">{{ tool.name }}</h3>
        <span
          v-if="tool.isAd"
          class="rounded-full border border-transparent bg-brand-50 px-2.5 py-[3px] text-[11px] font-semibold text-brand-500"
        >{{ t('sections.sponsorBadge') }}</span>
        <span v-else-if="tool.pricingType === 'FREE'" class="rounded-full bg-ink-100 px-2.5 py-[3px] text-[11px] font-semibold text-ink-700">{{ t('pricing.FREE') }}</span>
      </div>
      <p v-if="tool.shortDesc" class="mt-1.5 mb-2.5 line-clamp-2 text-[14.5px] leading-[1.6] text-ink-800">{{ tool.shortDesc }}</p>
      <div v-if="tool.tags?.length" class="flex flex-wrap gap-x-3.5 gap-y-1 text-[13px] text-ink-500">
        <span v-for="tag in tool.tags" :key="tag.slug">#{{ tag.name }}</span>
      </div>
      <span v-else-if="categoryLabel" class="text-[13px] text-ink-500">#{{ categoryLabel }}</span>
    </div>
  </NuxtLink>
</template>
