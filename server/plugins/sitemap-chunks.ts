import { defaultLocale, locales } from '../../i18n/settings'

// The language sitemaps are split in parts (nuxt.config.ts sitemap.sitemaps.pages), so each
// part is named "<locale>-pages". @nuxtjs/sitemap (8.5) tags each URL with its language
// ("vi") and, for a split sitemap, keeps only URLs tagged with the sitemap's own name — so
// every part came out empty. Tag each URL with its language's sitemap name here, from the
// URL's language prefix (/vi/…, English without one).
const prefixed = new Set<string>(locales.filter(l => l !== defaultLocale))

function sitemapOf(loc: string) {
  const path = loc.replace(/^https?:\/\/[^/]+/, '')
  const first = path.split('/')[1] ?? ''
  return `${prefixed.has(first) ? first : defaultLocale}-pages`
}

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('sitemap:input', (ctx) => {
    ctx.urls = ctx.urls.map((u) => {
      const entry = typeof u === 'string' ? { loc: u } : u
      if (entry._sitemap === false || !entry.loc) return entry
      return { ...entry, _sitemap: sitemapOf(entry.loc) }
    })
  })
})
