<script setup lang="ts">
import type { ToolsResponse } from '~/types'

const { locale } = useI18n()
const route = useRoute()
// Dashboard pages (user + admin) bring their own header/sidebar via layouts/dashboard.vue.
const isDashboard = computed(() => route.meta.layout === 'dashboard')
const isMinimalRoute = computed(() => ['/login', '/register', '/forgetPassword'].includes(route.path))

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
    <AnnouncementBar v-if="!isDashboard && !isMinimalRoute" :tool="announcementTool" />
    <AppHeader v-if="!isDashboard && !isMinimalRoute" />
    <main class="flex-1">
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </main>
    <AppFooter v-if="!isDashboard && !isMinimalRoute" />
    <ScrollToTop v-if="!isDashboard" />
  </div>
</template>
