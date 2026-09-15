<script setup lang="ts">
import type { ToolsResponse } from '~/types'

const { locale } = useI18n()
const route = useRoute()
const isAdminRoute = computed(() => route.path.startsWith('/admin'))

const { data: featuredRes } = await useFetch<ToolsResponse>('/api/tools', { query: computed(() => ({ featured: 'true', limit: 1, locale: locale.value })) })
const announcementTool = computed(() => featuredRes.value?.items?.[0])

const i18nHead = useLocaleHead()
useHead({
  htmlAttrs: computed(() => i18nHead.value.htmlAttrs)
})
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <NuxtLoadingIndicator color="linear-gradient(90deg,#db2777,#e11d48)" :height="3" />
    <AnnouncementBar v-if="!isAdminRoute" :tool="announcementTool" />
    <AdminHeader v-if="isAdminRoute" />
    <AppHeader v-else />
    <main class="flex-1">
      <NuxtPage />
    </main>
    <AppFooter v-if="!isAdminRoute" />
  </div>
</template>
