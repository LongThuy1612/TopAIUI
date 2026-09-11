// Locale-fallback helpers for translated content (ToolTranslation / CategoryTranslation /
// TagTranslation / PricingPlan / Faq). When the requested locale has no row, we fall back to
// English first, then to whichever locale actually has data — so the UI never shows an empty
// description/category name just because a translation hasn't been done yet for that locale.

/** Pick the single best-matching row (e.g. one CategoryTranslation) for a locale. */
export function pickByLocale<T extends { locale: string }>(rows: T[], locale: string): T | undefined {
  return rows.find(r => r.locale === locale) ?? rows.find(r => r.locale === 'en') ?? rows[0]
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
