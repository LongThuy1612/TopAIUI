import { defaultLocale as routedDefaultLocale, locales as routedLocales } from '../../i18n/settings'

// Locale-fallback helpers for translated content (ToolTranslation / CategoryTranslation /
// TagTranslation / PricingPlan / Faq). When the requested locale has no row, we fall back to
// English first, then to whichever locale actually has data — so the UI never shows an empty
// description/category name just because a translation hasn't been done yet for that locale.

// Every locale with a messages file in i18n/locales.
const SUPPORTED_LOCALES = new Set(['en', 'zh', 'es', 'de', 'ja', 'fr', 'ko', 'pt', 'id', 'vi', 'ar', 'da', 'fi', 'he', 'it', 'nl', 'no', 'ru', 'sv', 'th'])

/** A known locale code from a query value, else 'en'. Use it before keying a cache on the locale, so arbitrary values can't create unbounded cache entries. */
export function normalizeLocale(value: unknown): string {
  const code = String(value ?? '').toLowerCase()
  return SUPPORTED_LOCALES.has(code) ? code : 'en'
}

/** Pick the single best-matching row (e.g. one CategoryTranslation) for a locale. */
export function pickByLocale<T extends { locale: string }>(rows: T[], locale: string): T | undefined {
  return rows.find(r => r.locale === locale) ?? rows.find(r => r.locale === 'en') ?? rows[0]
}

/** Some rows were imported with the literal string "undefined" instead of a real value or null. */
export function cleanText(value: string | null | undefined): string | null {
  return value && value !== 'undefined' ? value : null
}

const JUNK_NAMES = new Set(['', 'undefined', 'null', 'none', 'n/a'])
const usableName = (value: string | null | undefined) => {
  const v = value?.trim()
  return v && !JUNK_NAMES.has(v.toLowerCase()) ? v : null
}
const titleOfSlug = (slug: string) => slug.split('-').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

/**
 * Display name for a category or tag: the first usable name among the locale's translation,
 * English, the base name (English), then the slug made readable. Unlike pickByLocale, an empty
 * or junk row for the locale does not hide a good English one, and a page never borrows a
 * third language's name.
 */
export function localizedName(rows: { locale: string; name: string | null }[] | undefined, locale: string, base: string | null | undefined, slug: string): string {
  const inLocale = (loc: string) => usableName(rows?.find(r => r.locale === loc && usableName(r.name))?.name)
  return inLocale(locale)
    ?? inLocale('en')
    ?? usableName(base)
    ?? titleOfSlug(slug)
}

/** Pick the full set of rows for the best-matching locale group (e.g. all PricingPlan rows for one locale). */
export function pickLocaleGroup<T extends { locale: string }>(rows: T[], locale: string): T[] {
  const forLocale = rows.filter(r => r.locale === locale)
  if (forLocale.length) return forLocale

  const en = rows.filter(r => r.locale === 'en')
  if (en.length) return en

  if (!rows.length) return []
  const fallbackLocale = rows[0]!.locale
  return rows.filter(r => r.locale === fallbackLocale)
}

// A site path in the visitor's language, for URLs the server hands out (email links,
// Stripe return pages): English has no prefix, other languages /vi/…, /ja/…. Only
// the languages that have routes (i18n/settings.ts) — not every messages file above.
const ROUTED_LOCALES = new Set<string>(routedLocales)
export function localizedPath(locale: unknown, path: string) {
  const code = String(locale ?? '').toLowerCase()
  if (code === routedDefaultLocale || !ROUTED_LOCALES.has(code)) return path
  return `/${code}${path === '/' ? '' : path}`
}
