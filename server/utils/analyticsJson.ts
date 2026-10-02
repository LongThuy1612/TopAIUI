// Shared readers for the loosely-shaped ToolAnalyticsData JSON columns, used by
// the tool detail API and the ranking API.

export const toList = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
export const asRecord = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {})
export const asNumber = (v: unknown): number | null => {
  const n = typeof v === 'string' ? parseFloat(v) : v
  return typeof n === 'number' && Number.isFinite(n) ? n : null
}

// geography is { data: [...], filters: {} }; each entry names a country (ISO
// numeric code or alpha-2) and its traffic share (fraction or percent).
// Returns alpha-2 + numeric codes (numeric matches the world map ids) and 0-100 shares.
export function normalizeGeography(geography: unknown, limit = 10) {
  const raw = Array.isArray(geography) ? geography : asRecord(geography).data ?? geography
  const entries: [unknown, unknown][] = Array.isArray(raw)
    ? raw.map(asRecord).map(r => [
        r.country ?? r.countryCode ?? r.country_code ?? r.code ?? r.key ?? r.id ?? r.name,
        r.share ?? r.value ?? r.percentage ?? r.pct ?? r.traffic_share ?? r.visits_share
      ])
    : Object.entries(asRecord(raw))

  const items = entries.flatMap(([country, share]) => {
    const pct = asNumber(share)
    const code = typeof country === 'string' && /^[A-Za-z]{2}$/.test(country)
      ? country.toUpperCase()
      : COUNTRY_NUMERIC_TO_ALPHA2[asNumber(country) ?? -1]
    if (!code || pct == null || pct <= 0) return []
    return [{ code, numeric: COUNTRY_ALPHA2_TO_NUMERIC[code] ?? null, pct }]
  })
  // Shares come as 0-1 fractions in some rows and as percentages in others.
  const isFraction = items.every(i => i.pct <= 1)
  return items
    .map(i => ({ ...i, pct: isFraction ? i.pct * 100 : i.pct }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, limit)
}
