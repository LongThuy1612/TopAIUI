import { defaultLocale, locales } from './i18n/settings'

// Page HTML cache rule. A cached render only sees the request headers listed
// in `varies`, and they're part of the cache key:
//   - cookie: dropped by server/middleware/01.page-cache-locale.ts (the language
//     is in the URL), except on "/" where it is reduced to the locale cookie that
//     decides the redirect to /vi, /ja… → one cache entry per language there
//   - host / x-forwarded-proto: so useRequestURL() (share links) sees the real
//     site URL instead of http://localhost. Not x-forwarded-host: h3 ignores it
//     unless asked to, so it would only let any client mint new cache entries.
function pageCache(maxAge: number) {
  return { cache: { maxAge, swr: true, varies: ['cookie', 'host', 'x-forwarded-proto'] } }
}

// English lives at /…, every other language under its prefix (/vi/…, i18n strategy
// prefix_except_default). Page rules are written once for the English paths and
// repeated here for each prefix; a redirect's target moves under the same prefix.
type RouteRule = Record<string, unknown>
const PREFIXED_LOCALES = locales.filter(code => code !== defaultLocale)
function localized(rules: Record<string, RouteRule>) {
  const out: Record<string, RouteRule> = { ...rules }
  for (const code of PREFIXED_LOCALES) {
    for (const [path, rule] of Object.entries(rules)) {
      const target = typeof rule.redirect === 'string' ? `/${code}${rule.redirect === '/' ? '' : rule.redirect}` : undefined
      out[path === '/' ? `/${code}` : `/${code}${path}`] = target ? { ...rule, redirect: target } : rule
    }
  }
  return out
}

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
    // One sitemap per language (i18n), each split in parts of 15,000 URLs: with the
    // hreflang links a URL takes ~1 KB, and a sitemap file may hold at most 50 MB /
    // 50,000 URLs. Files: /__sitemap__/en-pages-0.xml, … listed in /sitemap_index.xml.
    sitemaps: {
      pages: { includeAppSources: true, sources: ['/api/__sitemap__/urls'], chunks: 15000 }
    }
  },

  app: {
    head: {
      meta: [
        // impact.com affiliate site-ownership verification.
        { name: 'impact-site-verification', value: 'd27d1102-69e0-443e-b708-4a039c6b49d2' }
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/png', href: '/topaicollection.png' },
        { rel: 'apple-touch-icon', href: '/topaicollection.png' },
        { rel: 'manifest', href: '/manifest.json' },
        // Geist, the site font (tailwind.config.ts fontFamily.sans).
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&display=swap' }
      ]
    }
  },

  i18n: {
    baseUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    langDir: 'locales/',
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
    // language = hreflang / <html lang>. Language-only on purpose (es, not es-ES): a
    // region code would aim each version at one country, and Spanish speakers in
    // Mexico or Portuguese speakers in Brazil would be sent to English instead.
    locales: [
      { code: 'en', language: 'en', name: 'English', file: 'en.json' },
      { code: 'zh', language: 'zh', name: '中文', file: 'zh.json' },
      { code: 'es', language: 'es', name: 'Español', file: 'es.json' },
      { code: 'de', language: 'de', name: 'Deutsch', file: 'de.json' },
      { code: 'ja', language: 'ja', name: '日本語', file: 'ja.json' },
      { code: 'fr', language: 'fr', name: 'Français', file: 'fr.json' },
      { code: 'ko', language: 'ko', name: '한국어', file: 'ko.json' },
      // { code: 'it', name: 'Italiano', file: 'it.json' },
      // { code: 'nl', name: 'Nederlands', file: 'nl.json' },
      // { code: 'ru', name: 'Русский', file: 'ru.json' },
      { code: 'pt', language: 'pt', name: 'Português', file: 'pt.json' },
      // { code: 'sv', name: 'Svenska', file: 'sv.json' },
      // { code: 'da', name: 'Dansk', file: 'da.json' },
      // { code: 'no', name: 'Norsk', file: 'no.json' },
      // { code: 'fi', name: 'Suomi', file: 'fi.json' },
      // { code: 'ar', name: 'العربية', file: 'ar.json', dir: 'rtl' },
      // { code: 'he', name: 'עברית', file: 'he.json', dir: 'rtl' },
      // { code: 'th', name: 'ภาษาไทย', file: 'th.json' },
      { code: 'id', language: 'id', name: 'Bahasa Indonesia', file: 'id.json' },
      { code: 'vi', language: 'vi', name: 'Tiếng Việt', file: 'vi.json' }
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'topainew_locale',
      redirectOn: 'root'
    }
  },

  experimental: {
    // Pages are cached on the server (routeRules), so a client-side navigation just
    // calls their APIs. A separate _payload.json would be fetched on top of those
    // calls (every page carries ~100KB+ of shared lists) — twice the download.
    payloadExtraction: false,
    // Only prefetch a link's page on hover/focus. On visibility, every tool and
    // category link on screen was fetched after each navigation (MBs per switch).
    defaults: { nuxtLink: { prefetchOn: { visibility: false, interaction: true } } }
  },

  nitro: {
    preset: 'node-server',
    // Pre-compressed .br/.gz copies of the JS/CSS bundles, served by Accept-Encoding.
    // Dynamic responses are gzipped by server/plugins/compress.ts.
    compressPublicAssets: true,
    // Uploaded images (server/utils/uploads.ts). Local disk for now — mount it
    // as a volume in Docker (see docker-compose.yml); swap the driver for S3/R2
    // later without touching the upload code.
    storage: {
      uploads: { driver: 'fs', base: process.env.UPLOAD_DIR || './.data/uploads' },
      // Feedback attachments (server/utils/feedback.ts): private — never served
      // by /uploads, only through /api/feedback/<id>/attachment to the sender
      // and admins — and kept apart so the nightly uploads cleanup can't see them.
      feedback: { driver: 'fs', base: process.env.FEEDBACK_UPLOAD_DIR || './.data/feedback' },
      // Resized tool images (server/routes/img.get.ts). Only a cache — safe to delete,
      // and fine to lose on redeploy (it refills on demand).
      'image-cache': { driver: 'fs', base: process.env.IMAGE_CACHE_DIR || './.data/image-cache' }
    },
    devStorage: {
      uploads: { driver: 'fs', base: process.env.UPLOAD_DIR || './.data/uploads' },
      feedback: { driver: 'fs', base: process.env.FEEDBACK_UPLOAD_DIR || './.data/feedback' },
      'image-cache': { driver: 'fs', base: process.env.IMAGE_CACHE_DIR || './.data/image-cache' }
    },
    // Nightly cleanup of uploaded images no tool uses (server/tasks/uploads/cleanup.ts)
    // and of resized images older than 30 days (server/tasks/image-cache/prune.ts).
    // PayPal Research Plans whose cancelled period is over (server/tasks/research/paypal-cleanup.ts).
    // Hourly: the weekly newsletter, a few dozen addresses at a time (server/tasks/newsletter/send.ts).
    experimental: { tasks: true },
    scheduledTasks: { '30 3 * * *': ['uploads:cleanup'], '0 4 * * *': ['image-cache:prune'], '30 4 * * *': ['research:paypal-cleanup'], '45 4 * * *': ['search:cleanup', 'tools:stats-cleanup'], '5 * * * *': ['newsletter:send'] }
  },

  runtimeConfig: {
    adminToken: process.env.ADMIN_TOKEN || 'changeme-dev-token',
    adminPassword: process.env.ADMIN_PASSWORD || 'changeme-dev-password',
    userTokenSecret: process.env.USER_TOKEN_SECRET || 'changeme-dev-user-secret',
    // Override at runtime with NUXT_STRIPE_SECRET_KEY / NUXT_STRIPE_WEBHOOK_SECRET.
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    // PayPal checkout for promote orders (server/utils/paypal.ts). The client ID is in
    // `public` (the Pay with PayPal buttons only show when it is set). Override at runtime
    // with NUXT_PAYPAL_CLIENT_SECRET / NUXT_PAYPAL_WEBHOOK_ID / NUXT_PAYPAL_MODE
    // ('sandbox' | 'live') / NUXT_PUBLIC_PAYPAL_CLIENT_ID.
    paypalClientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
    paypalWebhookId: process.env.PAYPAL_WEBHOOK_ID || '',
    paypalMode: process.env.PAYPAL_MODE || 'sandbox',
    // DEV ONLY: treat every promote order as paid without going through
    // Stripe (see server/api/promote/checkout.post.ts). Ignored by production
    // builds (`nuxt build`) — only `nuxt dev` honours it.
    // Override at runtime with NUXT_FAKE_PAYMENT.
    fakePayment: process.env.FAKE_PAYMENT === 'true',
    // true when the app runs behind our own reverse proxy that appends the client IP to
    // X-Forwarded-For (server/utils/ads.ts, visitorIp). Override with NUXT_TRUST_PROXY.
    trustProxy: process.env.TRUST_PROXY === 'true',
    // Outgoing mail (server/utils/mailer.ts): email confirmation + password reset.
    // Override at runtime with NUXT_SMTP_HOST / NUXT_SMTP_PORT / NUXT_SMTP_USER /
    // NUXT_SMTP_PASS / NUXT_MAIL_FROM. No host = mail is only logged (dev) or fails (production).
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: process.env.SMTP_PORT || '587',
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    mailFrom: process.env.MAIL_FROM || 'TopAICollection <no-reply@topaicollection.com>',
    // Newsletter mails per rolling 24 hours (server/utils/newsletter.ts). Empty = 300, for
    // a plain Gmail account (~500 a day, shared with the account emails).
    newsletterDailyLimit: process.env.NEWSLETTER_DAILY_LIMIT || '',
    // Where new Contact-page messages are announced (Reply-To = the sender). Empty =
    // SUPPORT_EMAIL in shared/site.ts. Override at runtime with NUXT_CONTACT_INBOX.
    contactInbox: process.env.CONTACT_INBOX || '',
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      // OAuth Web client ID for "Sign in with Google" (not a secret). Also
      // used server-side as the expected ID-token audience.
      // Override at runtime with NUXT_PUBLIC_GOOGLE_CLIENT_ID.
      googleClientId: process.env.GOOGLE_CLIENT_ID || '',
      paypalClientId: process.env.PAYPAL_CLIENT_ID || '',
      // Stripe checkout for promote orders is switched off (PayPal is the main payment);
      // its code stays for later. In `nuxt dev` without PayPal keys the Stripe button shows
      // anyway, so FAKE_PAYMENT keeps working. Override at runtime with NUXT_PUBLIC_STRIPE_ENABLED.
      stripeEnabled: process.env.STRIPE_ENABLED === 'true'
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
    // The language sitemaps used to be one file each (/__sitemap__/vi.xml); now they are
    // split in parts (sitemap above). Search engines that knew the old files go to the index.
    ...Object.fromEntries(locales.map(code => [`/__sitemap__/${code}.xml`, { redirect: { to: '/sitemap_index.xml', statusCode: 301 } }])),
    ...localized({
      // Public — safe to cache, identical for everyone in the same language
      // (see pageCache below).
      '/': pageCache(60),
      '/category/**': pageCache(300),
      '/categories': pageCache(300),
      '/tag/**': pageCache(600),
      '/tools/**': pageCache(3600),
      '/new': pageCache(60),
      '/today': pageCache(60),
      '/most-featured': pageCache(300),
      '/most-saved': pageCache(300),
      '/discord': pageCache(300),
      '/archive/**': pageCache(600),
      '/alphabet/**': pageCache(600),
      // The ranking dataset itself is rebuilt hourly (server/utils/ranking.ts).
      '/ranking': pageCache(600),
      '/ranking/**': pageCache(600),
      '/ai-news': pageCache(300),
      '/ai-news/**': pageCache(600),
      '/gpts': pageCache(300),
      '/gpts/**': pageCache(600),
      // Company, help and legal pages: static text. The contact form posts to the API
      // and shows the signed-in prefill only in the browser, so its HTML is shared too.
      '/about': pageCache(3600),
      '/pricing': pageCache(3600),
      '/faq': pageCache(3600),
      '/help': pageCache(3600),
      '/contact': pageCache(3600),
      '/terms': pageCache(3600),
      '/privacy': pageCache(3600),
      '/cookies': pageCache(3600),
      '/editorial-guidelines': pageCache(3600),
      '/review-methodology': pageCache(3600),

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
      // Research Report was removed.
      '/admin/research-report': { redirect: '/dashboard' },
      '/dashboard/research-report': { redirect: '/dashboard' },
      '/admin/my-ais': { redirect: '/dashboard/my-ais' },
      '/admin/advertise': { redirect: '/dashboard/advertise' },
      '/admin/my-posts': { redirect: '/dashboard/my-posts' },
      '/admin/my-gpts': { redirect: '/dashboard/my-gpts' },
      '/admin/payment-invoice': { redirect: '/dashboard/payment-invoice' },
      '/admin/feedback': { redirect: '/dashboard/feedback' },

      // Revenue ranking is hidden until there is revenue data to rank by.
      '/ranking/revenue': { redirect: '/ranking' },

      // Account and order pages: nothing for search engines (also keeps them out of the sitemap).
      '/login': { robots: false },
      '/register': { robots: false },
      '/forgetPassword': { robots: false },
      '/orders': { robots: false },
      // Search results: endless thin pages for any query (not cached either).
      '/search': { robots: false },

      // One-time token in the query string: never cached, indexed or leaked to
      // other sites through the Referer header.
      '/reset-password': { robots: false, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } },
      // ssr: false — confirming needs the session token, which only the browser has.
      '/verify-email': { ssr: false, robots: false, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } },
      // The newsletter's unsubscribe link (signed id in the query string).
      '/newsletter/unsubscribe': { robots: false, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } }
    }),

    // API — data endpoints stay dynamic; admin API additionally is not CORS-open
    '/api/admin/**': { cors: false, headers: { 'Cache-Control': 'no-store' } },
    '/api/me/**': { headers: { 'Cache-Control': 'no-store' } },
    '/api/**': { cors: true }
  },

  // In dev the page cache above persists to .nuxt/cache and keeps serving HTML
  // rendered by old component code for up to an hour; Vue then hydrates it with
  // the new code but doesn't patch mismatched classes, so edits look broken.
  $development: {
    routeRules: localized({
        '/': { cache: false },
        '/category/**': { cache: false },
        '/tag/**': { cache: false },
        '/tools/**': { cache: false },
        '/new': { cache: false },
        '/today': { cache: false },
        '/most-featured': { cache: false },
        '/most-saved': { cache: false },
        '/discord': { cache: false },
        '/archive/**': { cache: false },
        '/alphabet/**': { cache: false },
        '/ranking': { cache: false },
        '/ranking/**': { cache: false },
        '/ai-news': { cache: false },
        '/ai-news/**': { cache: false },
        '/gpts': { cache: false },
        '/gpts/**': { cache: false },
        '/about': { cache: false },
        '/pricing': { cache: false },
        '/faq': { cache: false },
        '/help': { cache: false },
        '/contact': { cache: false },
        '/terms': { cache: false },
        '/privacy': { cache: false },
        '/cookies': { cache: false },
        '/editorial-guidelines': { cache: false },
        '/review-methodology': { cache: false }
    })
  }
})
