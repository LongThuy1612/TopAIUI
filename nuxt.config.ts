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
    preset: 'node-server',
    // Uploaded images (server/utils/uploads.ts). Local disk for now — mount it
    // as a volume in Docker (see docker-compose.yml); swap the driver for S3/R2
    // later without touching the upload code.
    storage: {
      uploads: { driver: 'fs', base: process.env.UPLOAD_DIR || './.data/uploads' }
    },
    devStorage: {
      uploads: { driver: 'fs', base: process.env.UPLOAD_DIR || './.data/uploads' }
    },
    // Nightly cleanup of uploaded images no tool uses (server/tasks/uploads/cleanup.ts).
    experimental: { tasks: true },
    scheduledTasks: { '30 3 * * *': ['uploads:cleanup'] }
  },

  runtimeConfig: {
    adminToken: process.env.ADMIN_TOKEN || 'changeme-dev-token',
    adminPassword: process.env.ADMIN_PASSWORD || 'changeme-dev-password',
    userTokenSecret: process.env.USER_TOKEN_SECRET || 'changeme-dev-user-secret',
    // Override at runtime with NUXT_STRIPE_SECRET_KEY / NUXT_STRIPE_WEBHOOK_SECRET.
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    // DEV ONLY: treat every promote order as paid without going through
    // Stripe (see server/api/promote/checkout.post.ts). Ignored by production
    // builds (`nuxt build`) — only `nuxt dev` honours it.
    // Override at runtime with NUXT_FAKE_PAYMENT.
    fakePayment: process.env.FAKE_PAYMENT === 'true',
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      // OAuth Web client ID for "Sign in with Google" (not a secret). Also
      // used server-side as the expected ID-token audience.
      // Override at runtime with NUXT_PUBLIC_GOOGLE_CLIENT_ID.
      googleClientId: process.env.GOOGLE_CLIENT_ID || ''
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

    // Dashboard (every logged-in user) and admin-only pages — always dynamic,
    // never cached, hidden from search engines.
    // ssr: false is required here: the user session token only lives in the
    // browser's storage (see useAuth.ts), so a server-rendered request never
    // has it, and the auth / admin route middleware can only decide
    // client-side, where the token actually exists.
    '/dashboard/**': {
      ssr: false,
      robots: false,
      headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }
    },
    '/admin/**': {
      ssr: false,
      robots: false,
      headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }
    },

    // Old admin URLs → their new dashboard home (keeps bookmarks working).
    '/admin': { redirect: '/dashboard' },
    '/admin/insights': { redirect: '/dashboard/insights' },
    '/admin/social-listening': { redirect: '/dashboard/social-listening' },
    '/admin/research-report': { redirect: '/dashboard/research-report' },
    '/admin/my-ais': { redirect: '/dashboard/my-ais' },
    '/admin/advertise': { redirect: '/dashboard/advertise' },
    '/admin/my-posts': { redirect: '/dashboard/my-posts' },
    '/admin/my-gpts': { redirect: '/dashboard/my-gpts' },
    '/admin/payment-invoice': { redirect: '/dashboard/payment-invoice' },
    '/admin/feedback': { redirect: '/dashboard/feedback' },

    // Revenue ranking is hidden until there is revenue data to rank by.
    '/ranking/revenue': { redirect: '/ranking' },

    // API — data endpoints stay dynamic; admin API additionally is not CORS-open
    '/api/admin/**': { cors: false, headers: { 'Cache-Control': 'no-store' } },
    '/api/me/**': { headers: { 'Cache-Control': 'no-store' } },
    '/api/**': { cors: true }
  },

  // In dev the page cache above persists to .nuxt/cache and keeps serving HTML
  // rendered by old component code for up to an hour; Vue then hydrates it with
  // the new code but doesn't patch mismatched classes, so edits look broken.
  $development: {
    routeRules: {
      '/': { cache: false },
      '/category/**': { cache: false },
      '/tools/**': { cache: false }
    }
  }
})
