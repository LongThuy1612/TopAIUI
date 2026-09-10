export default defineNuxtConfig({
  compatibilityDate: '2026-01-01',
  future: { compatibilityVersion: 4 },
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@nuxtjs/i18n', '@nuxt/icon'],
  css: ['~/assets/css/main.css'],

  i18n: {
    lazy: true,
    langDir: 'locales/',
    defaultLocale: 'en',
    strategy: 'no_prefix',
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'vi', name: 'Tiếng Việt', file: 'vi.json' }
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

    // Admin / CMS — always dynamic, never cached, hidden from search engines
    '/admin/**': {
      ssr: true,
      headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }
    },

    // API — data endpoints stay dynamic; admin API additionally is not CORS-open
    '/api/admin/**': { cors: false, headers: { 'Cache-Control': 'no-store' } },
    '/api/**': { cors: true }
  }
})
