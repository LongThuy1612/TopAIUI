<script setup lang="ts">
const props = defineProps<{
  tool: { slug: string; name: string; pricingType: 'FREE' | 'FREEMIUM' | 'PAID'; logoUrl?: string; categories?: { name: string }[]; shortDesc?: string | null }
  rank?: number
  featured?: boolean
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
  <NuxtLinkLocale
    v-if="featured"
    :to="`/tools/${tool.slug}`"
    class="relative flex flex-col gap-3 overflow-hidden rounded-[18px] border border-ink-100 bg-white p-5 transition-shadow hover:shadow-[0_16px_32px_-20px_rgba(23,18,26,.45)]"
  >
    <img
      v-if="tool.logoUrl"
      data-logo
      :src="sizedImage(tool.logoUrl, 64, 64)"
      :alt="tool.name"
      loading="lazy"
      class="pointer-events-none absolute -top-3 -right-4 h-28 w-28 rounded-full object-cover opacity-[0.16]"
    >
    <template v-else>
      <span class="pointer-events-none absolute -top-[18px] -right-[22px] h-32 w-32 rounded-full bg-brand-500 opacity-[0.06]"></span>
      <span class="pointer-events-none absolute top-2 right-0.5 text-[46px] font-extrabold tracking-[.02em] text-brand-500 opacity-[0.12]">{{ initials }}</span>
    </template>
    <div class="relative flex items-start gap-[11px]">
      <div v-if="tool.logoUrl" class="h-9 w-9 shrink-0 overflow-hidden rounded-full">
        <img data-logo :src="sizedImage(tool.logoUrl, 64, 64)" :alt="tool.name" loading="lazy" class="h-full w-full object-cover">
      </div>
      <span v-else class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500 text-[12.5px] font-extrabold text-white">{{ initials }}</span>
      <span class="line-clamp-2 min-w-0 text-[17px] font-extrabold tracking-[-.02em] text-ink-900">{{ tool.name }}</span>
    </div>
    <p v-if="tool.shortDesc" class="relative line-clamp-2 text-sm leading-[1.6] text-[#7A5566]">{{ tool.shortDesc }}</p>
    <p v-else-if="tool.categories?.length" class="relative line-clamp-2 text-sm leading-[1.6] text-[#7A5566]">{{ tool.categories.map(c => c.name).join(', ') }}</p>
  </NuxtLinkLocale>

  <NuxtLinkLocale v-else :to="`/tools/${tool.slug}`" class="group flex items-start gap-3 rounded-xl border border-ink-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md">
    <span v-if="rank" :class="['flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold', rankStyle]">
      {{ rank }}
    </span>
    <div v-if="tool.logoUrl" class="h-11 w-11 shrink-0 overflow-hidden rounded-lg">
      <img data-logo :src="sizedImage(tool.logoUrl, 64, 64)" :alt="tool.name" loading="lazy" class="h-full w-full object-cover">
    </div>
    <div v-else class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white">
      {{ initials }}
    </div>
    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-2">
        <h3 class="truncate text-base font-semibold text-ink-900 group-hover:text-brand-600">{{ tool.name }}</h3>
        <span :class="['shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold', pricingStyle[tool.pricingType]]">{{ t(`pricing.${tool.pricingType}`) }}</span>
      </div>
      <p v-if="tool.shortDesc" class="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-600">{{ tool.shortDesc }}</p>
      <p v-else-if="tool.categories?.length" class="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-600">{{ tool.categories.map(c => c.name).join(', ') }}</p>
    </div>
  </NuxtLinkLocale>
</template>
