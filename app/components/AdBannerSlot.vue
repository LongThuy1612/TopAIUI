<script setup lang="ts">
import type { AdPlacement } from '~/types'

// A page's single sponsored banner (ranking pages): fetches its own slot and renders
// nothing when no campaign is running.
const props = defineProps<{ placement: AdPlacement }>()

const { slots } = useAdSlots(props.placement, { positions: [1] })
const ad = computed(() => slots.value[0])
</script>

<template>
  <AdBanner v-if="ad" :ad="ad" :placement="placement" />
</template>
