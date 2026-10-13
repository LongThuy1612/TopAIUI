<script setup lang="ts">
import type { ToolsResponse } from '~/types'

const { locale } = useI18n()
const route = useRoute()
// Dashboard pages (user + admin) bring their own header/sidebar via layouts/dashboard.vue.
const isDashboard = computed(() => route.meta.layout === 'dashboard')
const basePath = useBasePath()
const isMinimalRoute = computed(() => ['/login', '/register', '/forgetPassword'].includes(basePath.value))

const { data: featuredRes } = await useFetch<ToolsResponse>('/api/tools', { query: computed(() => ({ featured: 'true', limit: 1, locale: locale.value })) })
const announcementTool = computed(() => featuredRes.value?.items?.[0])

const i18nHead = useLocaleHead()
useHead({
  htmlAttrs: computed(() => i18nHead.value.htmlAttrs)
})

// SEO defaults for every page; a page's own useSeoMeta (set later) wins.
// Canonical = the path without query: filters (?q, ?sort, ?pricing) and tracking
// parameters point back to the main page instead of counting as duplicates. A
// language version without its own content points at English (useSeoLocales).
// hreflang tells search engines which URLs are the same page in other languages.
const abs = useAbsoluteUrl()
const { canonical, alternates } = usePageSeoUrls()
// Open Graph wants language_TERRITORY; hreflang uses language-only codes.
const OG_LOCALES: Record<string, string> = {
  en: 'en_US', zh: 'zh_CN', es: 'es_ES', de: 'de_DE', ja: 'ja_JP', fr: 'fr_FR', ko: 'ko_KR', pt: 'pt_PT', id: 'id_ID', vi: 'vi_VN'
}
useHead({ link: computed(() => [{ rel: 'canonical', href: canonical.value }, ...alternates.value]) })
useSeoMeta({
  ogSiteName: 'TopAICollection',
  ogType: 'website',
  ogUrl: canonical,
  ogImage: abs('/topaicollection.png'),
  ogLocale: () => OG_LOCALES[locale.value] ?? 'en_US',
  twitterCard: 'summary',
  twitterSite: '@aicollectioninc'
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
    <AppToaster />
  </div>
</template>
