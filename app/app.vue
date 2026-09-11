<script setup lang="ts">
import type { ToolsResponse } from '~/types'

const { data: featuredRes } = await useFetch<ToolsResponse>('/api/tools', { query: { featured: 'true', limit: 1 } })
const announcementTool = computed(() => featuredRes.value?.items?.[0])
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <NuxtLoadingIndicator color="linear-gradient(90deg,#0ea5e9,#38bdf8)" :height="3" />
    <AnnouncementBar :tool="announcementTool" />
    <AppHeader />
    <main class="flex-1">
      <NuxtPage />
    </main>
    <AppFooter />
  </div>
</template>
