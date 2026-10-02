// Crawled logos/screenshots are sometimes stored as paths relative to the
// tool's own site (e.g. "/3.3.2/img/logo.png" from an og:image or favicon tag).
// Rendered as-is they'd load from our domain and 404, so resolve them against
// the tool's website. Absolute URLs and our own uploads pass through.
export function resolveToolImage(url: string | null | undefined, website: string | null | undefined): string | null {
  const value = url?.trim()
  if (!value) return null
  if (/^(https?:)?\/\//i.test(value) || value.startsWith('data:') || value.startsWith('/uploads/')) return value
  if (!website) return null
  try {
    return new URL(value, website).href
  } catch {
    return null
  }
}

/** `images` is a JSON array of strings or { url } objects — resolves each entry, drops unusable ones. */
export function resolveToolImages(images: unknown, website: string | null | undefined): string[] {
  if (!Array.isArray(images)) return []
  return images
    .map(item => resolveToolImage(typeof item === 'string' ? item : (item as { url?: string } | null)?.url, website))
    .filter((url): url is string => !!url)
}
