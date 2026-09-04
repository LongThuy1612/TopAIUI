<script setup lang="ts">
const props = defineProps<{
  tool: { slug: string; name: string; pricingType: 'FREE' | 'FREEMIUM' | 'PAID'; logoUrl?: string }
  rank?: number
  categoryLabel?: string
}>()

const { t } = useI18n()

const pricingStyle: Record<string, string> = {
  FREE: 'bg-emerald-50 text-emerald-700',
  FREEMIUM: 'bg-brand-50 text-brand-700',
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
  <NuxtLink :to="`/tools/${tool.slug}`" class="group flex items-start gap-4 rounded-xl px-2 py-3 transition hover:bg-ink-100/50 sm:px-3">
    <span v-if="rank" :class="['w-5 shrink-0 pt-2 text-center text-sm font-bold', rankStyle]">{{ rank }}</span>
    <div v-if="tool.logoUrl" class="h-11 w-11 shrink-0 overflow-hidden rounded-lg">
      <img :src="tool.logoUrl" :alt="tool.name" class="h-full w-full object-cover">
    </div>
    <div v-else class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white">
      {{ initials }}
    </div>
    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-center gap-2">
        <h3 class="text-base font-semibold text-ink-900 group-hover:text-brand-600">{{ tool.name }}</h3>
        <span :class="['shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold', pricingStyle[tool.pricingType]]">{{ t(`pricing.${tool.pricingType}`) }}</span>
      </div>
      <span v-if="categoryLabel" class="mt-2 inline-block rounded-full bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-500">{{ categoryLabel }}</span>
    </div>
  </NuxtLink>
</template>
