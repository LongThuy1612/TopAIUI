<script setup lang="ts">
import { externalLinkRel } from '#shared/markdown'
import { guestPost } from '#shared/promote'

// Link to an AI News entry: our article page, or — for a link item — straight to the
// outside page in a new tab, with the same rel as links inside articles.
defineProps<{ item: { slug: string; externalUrl?: string | null } }>()
const rel = externalLinkRel(guestPost.linkRel)
</script>

<template>
  <a v-if="item.externalUrl" :href="item.externalUrl" target="_blank" :rel="rel"><slot /></a>
  <NuxtLink v-else :to="`/ai-news/${item.slug}`"><slot /></NuxtLink>
</template>
