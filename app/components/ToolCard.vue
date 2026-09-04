<script setup lang="ts">
const props = defineProps<{
  tool: { slug: string; name: string; pricingType: 'FREE' | 'FREEMIUM' | 'PAID'; logoUrl?: string; categories?: { name: string }[] }
  rank?: number
}>()

const { t } = useI18n()

const pricingStyle: Record<string, string> = {
  FREE: 'bg-emerald-50 text-emerald-700',
  FREEMIUM: 'bg-brand-50 text-brand-700',
  PAID: 'bg-amber-50 text-amber-700'
}

const initials = computed(() => props.tool.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'AI')

const rankStyle = computed(() => {
  if (!props.rank) return ''
  if (props.rank === 1) return 'bg-amber-400 text-white'
  if (props.rank === 2) return 'bg-ink-400 text-white'
  if (props.rank === 3) return 'bg-amber-700 text-white'
  return 'bg-ink-100 text-ink-500'
})
</script>

<template>
  <NuxtLink :to="`/tools/${tool.slug}`" class="group flex items-start gap-3 rounded-xl border border-ink-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md">
    <span v-if="rank" :class="['flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold', rankStyle]">
      {{ rank }}
    </span>
    <div v-if="tool.logoUrl" class="h-11 w-11 shrink-0 overflow-hidden rounded-lg">
      <img :src="tool.logoUrl" :alt="tool.name" class="h-full w-full object-cover">
    </div>
    <div v-else class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white">
      {{ initials }}
    </div>
    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-2">
        <h3 class="truncate text-base font-semibold text-ink-900 group-hover:text-brand-600">{{ tool.name }}</h3>
        <span :class="['shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold', pricingStyle[tool.pricingType]]">{{ t(`pricing.${tool.pricingType}`) }}</span>
      </div>
      <p v-if="tool.categories?.length" class="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-600">{{ tool.categories.map(c => c.name).join(', ') }}</p>
    </div>
  </NuxtLink>
</template>
