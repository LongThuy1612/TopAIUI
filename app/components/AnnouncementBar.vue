<script setup lang="ts">
const { t } = useI18n()
const props = defineProps<{ tool?: { slug: string; name: string; shortDesc?: string | null } }>()

// A featured ad campaign takes the bar when there is one (rotated on every page view);
// otherwise it shows the site's own featured tool.
const { slots } = useAdSlots('bar')
const ad = computed(() => slots.value[0])
const shown = computed(() => ad.value?.tool ?? props.tool)
</script>

<template>
  <NuxtLinkLocale
    v-if="shown"
    :to="ad ? ad.clickUrl : `/tools/${shown.slug}`"
    :external="!!ad"
    :target="ad ? '_blank' : undefined"
    :rel="ad ? 'sponsored nofollow noopener' : undefined"
    :data-ad-slot="ad?.campaignId"
    :data-ad-placement="ad ? 'bar' : undefined"
    class="flex w-full flex-wrap items-center justify-center gap-3.5 bg-ink-900 px-5 py-[11px] text-center text-[13.5px] font-medium text-white hover:text-white"
  >
    <span class="rounded border border-brand-200/40 px-[7px] py-[2px] text-[10.5px] font-semibold uppercase tracking-[.14em] text-brand-200">
      {{ ad ? t('sections.sponsorBadge') : t('announcement.featured') }}
    </span>
    <span class="font-bold">{{ shown.name }}</span>
    <span v-if="shown.shortDesc" class="max-w-md truncate text-white/60">{{ shown.shortDesc }}</span>
    <span class="font-semibold text-brand-200">{{ t('announcement.cta') }} →</span>
  </NuxtLinkLocale>
</template>
