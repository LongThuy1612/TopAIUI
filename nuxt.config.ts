export default defineNuxtConfig({
  compatibilityDate: '2026-01-01',
  future: { compatibilityVersion: 4 },
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@nuxtjs/i18n', '@nuxt/icon', '@nuxtjs/sitemap', '@nuxtjs/robots'],
  css: ['~/assets/css/main.css'],

  site: {
    url: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  },

  sitemap: {
    sources: ['/api/__sitemap__/urls']
  },

  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/png', href: '/topaicollection.png' },
        { rel: 'apple-touch-icon', href: '/topaicollection.png' },
        { rel: 'manifest', href: '/manifest.json' }
      ]
    }
  },

  i18n: {
    baseUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    langDir: 'locales/',
    defaultLocale: 'en',
    strategy: 'no_prefix',
    locales: [
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json' },
      { code: 'zh', language: 'zh-CN', name: '中文', file: 'zh.json' },
      { code: 'es', language: 'es-ES', name: 'Español', file: 'es.json' },
      { code: 'de', language: 'de-DE', name: 'Deutsch', file: 'de.json' },
      { code: 'ja', language: 'ja-JP', name: '日本語', file: 'ja.json' },
      { code: 'fr', language: 'fr-FR', name: 'Français', file: 'fr.json' },
      { code: 'ko', language: 'ko-KR', name: '한국어', file: 'ko.json' },
      // { code: 'it', name: 'Italiano', file: 'it.json' },
      // { code: 'nl', name: 'Nederlands', file: 'nl.json' },
      // { code: 'ru', name: 'Русский', file: 'ru.json' },
      { code: 'pt', language: 'pt-PT', name: 'Português', file: 'pt.json' },
      // { code: 'sv', name: 'Svenska', file: 'sv.json' },
      // { code: 'da', name: 'Dansk', file: 'da.json' },
      // { code: 'no', name: 'Norsk', file: 'no.json' },
      // { code: 'fi', name: 'Suomi', file: 'fi.json' },
      // { code: 'ar', name: 'العربية', file: 'ar.json', dir: 'rtl' },
      // { code: 'he', name: 'עברית', file: 'he.json', dir: 'rtl' },
      // { code: 'th', name: 'ภาษาไทย', file: 'th.json' },
      { code: 'id', language: 'id-ID', name: 'Bahasa Indonesia', file: 'id.json' },
      { code: 'vi', language: 'vi-VN', name: 'Tiếng Việt', file: 'vi.json' }
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'topainew_locale',
      redirectOn: 'root'
    }
  },

  nitro: {
    preset: 'node-server'
  },

  runtimeConfig: {
    adminToken: process.env.ADMIN_TOKEN || 'changeme-dev-token',
    adminPassword: process.env.ADMIN_PASSWORD || 'changeme-dev-password',
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    }
  },

  // --- HTML cache strategy: public catalog vs. Admin/CMS vs. User areas ---
  //
  // PUBLIC pages (same HTML for every visitor) → safe to cache.
  // `isr` only has a runtime implementation on the Vercel/Netlify/Zeabur
  // presets — on `node-server` it is silently ignored, so self-hosted Docker
  // deploys need the generic `cache` route rule instead (backed by Nitro's
  // built-in storage, `swr: true` serves the stale page instantly while
  // revalidating in the background).
  //
  // ADMIN / CMS pages → must NEVER be cached or shared between requests:
  //   - could leak one admin's session/data to another visitor
  //   - would show stale data right after an edit/approve/delete
  //   - should not be indexed by search engines
  //
  // USER / personalized pages (dashboard, "my submissions") → same reasoning,
  // each response is specific to the logged-in user, so caching is unsafe.
  routeRules: {
    // Public — safe to cache, identical for everyone
    '/': { cache: { maxAge: 60, swr: true } },
    '/category/**': { cache: { maxAge: 300, swr: true } },
    '/tools/**': { cache: { maxAge: 3600, swr: true } },

    // Public form, but has per-submission state (success/error) — don't cache
    '/submit': { headers: { 'Cache-Control': 'no-store' } },

    // Admin / CMS — always dynamic, never cached, hidden from search engines.
    // ssr: false is required here: the admin token only lives in the
    // browser's localStorage (see useAdminAuth.ts), so a server-rendered
    // request never has it, always 401s on the admin API calls, and
    // redirects to /admin/login — which then bounces straight back once its
    // client-side check finds the real token. Disabling SSR skips that
    // phantom unauthenticated render entirely so auth only ever resolves
    // client-side, where the token actually exists.
    '/admin/**': {
      ssr: false,
      robots: false,
      headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }
    },

    // API — data endpoints stay dynamic; admin API additionally is not CORS-open
    '/api/admin/**': { cors: false, headers: { 'Cache-Control': 'no-store' } },
    '/api/**': { cors: true }
  }
})
