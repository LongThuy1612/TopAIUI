// Multilingual SEO. English lives at /…, other languages at /vi/…, /ja/…; each page
// is in every language unless it says otherwise. Pages whose content has no
// translation (AI News articles, GPTs, a tool without one in this language) call
// useSeoLocales with the languages that really exist: hreflang then lists only
// those, and the other language versions point their canonical at English, so
// search engines don't index the same English text ten times.

interface SeoLocalesState { path: string; locales: string[] }

export function useSeoLocales(locales: () => string[] | null | undefined) {
  const state = useState<SeoLocalesState | null>('seo-locales', () => null)
  const route = useRoute()
  // Tagged with the path: a page that doesn't call this never inherits the
  // previous page's list after client-side navigation.
  watchEffect(() => {
    const list = locales()
    state.value = list?.length ? { path: route.path, locales: list } : null
  })
}

// Languages that have this page (null = all), canonical URL and hreflang links.
export function usePageSeoUrls() {
  const route = useRoute()
  const { locale, locales } = useI18n()
  const switchLocalePath = useSwitchLocalePath()
  const abs = useAbsoluteUrl()
  const state = useState<SeoLocalesState | null>('seo-locales', () => null)

  const clean = (path: string) => {
    const p = path.split(/[?#]/)[0] || '/'
    return p.length > 1 ? p.replace(/\/+$/, '') : p
  }
  const available = computed(() => (state.value?.path === route.path ? state.value.locales : null))
  const isAvailable = (code: string) => !available.value || available.value.includes(code)

  const canonical = computed(() => abs(clean(isAvailable(locale.value) ? route.path : switchLocalePath('en'))))

  const alternates = computed(() => {
    const links = locales.value
      .filter(l => isAvailable(l.code))
      // Language-only codes (pt, not pt-PT): one page per language, matching the sitemap.
      .map(l => ({ rel: 'alternate', hreflang: l.code, href: abs(clean(switchLocalePath(l.code))) }))
    if (isAvailable('en')) links.push({ rel: 'alternate', hreflang: 'x-default', href: abs(clean(switchLocalePath('en'))) })
    return links
  })

  return { canonical, alternates }
}
