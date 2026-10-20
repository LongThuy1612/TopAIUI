<script setup lang="ts">
// /category/all: every tool, as a grid with the category browser (CategoryAllTools).
// /category/<slug>: one category's (or group's) page, its tools as full cards (CategoryDetail).
const route = useRoute()
const slug = computed(() => String(route.params.slug))
</script>

<template>
  <CategoryAllTools v-if="slug === 'all'" />
  <CategoryDetail v-else :key="slug" :slug="slug" />
</template>
