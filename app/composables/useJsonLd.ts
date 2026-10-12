// Structured data (schema.org JSON-LD) for search engines. `key` lets a page replace
// its own block on navigation instead of stacking a new one.
export function useJsonLd(key: string, data: () => Record<string, unknown> | Record<string, unknown>[] | null) {
  useHead(() => {
    const value = data()
    if (!value) return {}
    return {
      script: [{
        key: `ld-${key}`,
        type: 'application/ld+json',
        // "</" inside a string would close the <script> tag early.
        innerHTML: JSON.stringify(value).replace(/</g, '\\u003c')
      }]
    }
  })
}

// Absolute URL on this site, for structured data and og:image.
export function useAbsoluteUrl() {
  const base = useRuntimeConfig().public.siteUrl.replace(/\/+$/, '')
  return (path: string) => (/^https?:\/\//i.test(path) ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`)
}

// Home › … › current page. `items` are [name, path] pairs after Home.
export function useBreadcrumbLd(items: () => [name: string, path: string][]) {
  const abs = useAbsoluteUrl()
  useJsonLd('breadcrumb', () => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [['Home', '/'] as [string, string], ...items()].map(([name, path], i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name,
      item: abs(path)
    }))
  }))
}

// The site's Organization node. Pages referring to it (publisher, about) embed it in
// full: an "@id" alone only resolves on the home page, where it is declared.
export function useOrganizationNode() {
  const abs = useAbsoluteUrl()
  return { '@type': 'Organization', '@id': abs('/#organization'), name: 'TopAICollection', url: abs('/'), logo: abs('/topaicollection.png') }
}
