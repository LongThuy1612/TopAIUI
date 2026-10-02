// Crawled logos/screenshots are sometimes stored as relative paths (e.g.
// "/3.3.2/img/logo.f3a91ce.png") with no way to tell which site they belong
// to — several tools even share the same one, so it isn't the tool's own image.
// Rendered as-is they load from our domain and 404, so drop them: the UI then
// falls back to initials / no slide. Absolute URLs and our own uploads pass through.
export function resolveToolImage(url: string | null | undefined): string | null {
  const value = url?.trim()
  if (!value) return null
  if (/^(https?:)?\/\//i.test(value) || value.startsWith('data:') || value.startsWith('/uploads/')) return value
  return null
}

/** `images` is a JSON array of strings or { url } objects — keeps only usable URLs. */
export function resolveToolImages(images: unknown): string[] {
  if (!Array.isArray(images)) return []
  return images
    .map(item => resolveToolImage(typeof item === 'string' ? item : (item as { url?: string } | null)?.url))
    .filter((url): url is string => !!url)
}
