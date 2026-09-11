<script setup lang="ts">
const props = defineProps<{
  tool: { slug: string; name: string; pricingType: 'FREE' | 'FREEMIUM' | 'PAID'; logoUrl?: string; shortDesc?: string | null }
  rank?: number
  categoryLabel?: string
}>()

const { t } = useI18n()

const pricingStyle: Record<string, string> = {
  FREE: 'bg-brand-100 text-brand-600',
  FREEMIUM: 'border border-brand-300 text-brand-600',
  PAID: 'bg-amber-50 text-amber-700'
}

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
  <NuxtLink :to="`/tools/${tool.slug}`" class="group flex items-start gap-[18px] py-[22px]">
    <span v-if="rank" :class="['w-5 shrink-0 pt-4 text-center text-sm font-bold', rankStyle]">{{ rank }}</span>
    <div v-if="tool.logoUrl" class="h-14 w-14 shrink-0 overflow-hidden rounded-[14px]">
      <img :src="tool.logoUrl" :alt="tool.name" class="h-full w-full object-cover">
    </div>
    <span v-else class="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] bg-brand-100 text-lg font-extrabold text-brand-600">
      {{ initials }}
    </span>
    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-center gap-2.5">
        <h3 class="text-lg font-extrabold text-ink-900 group-hover:text-brand-500">{{ tool.name }}</h3>
        <span :class="['rounded-md px-[9px] py-[3px] text-[11px] font-bold', pricingStyle[tool.pricingType]]">{{ t(`pricing.${tool.pricingType}`) }}</span>
      </div>
      <p v-if="tool.shortDesc" class="mt-1.5 line-clamp-2 text-[15px] leading-[1.55] text-ink-600">{{ tool.shortDesc }}</p>
      <p v-if="categoryLabel" class="mt-1.5 text-[13px] text-ink-500">{{ categoryLabel }}</p>
    </div>
  </NuxtLink>
</template>
