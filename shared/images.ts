// Tool images served through our own resizer (server/routes/img.get.ts) instead of
// straight from their host: hosts whose originals are large (a "logo" of a few hundred
// KB shown at 36 px) and that can't resize on the fly themselves. imgix hosts resize
// through URL parameters instead (app/utils/image.ts). Only these hosts are fetched —
// the resizer is not an open proxy.
export const IMAGE_PROXY_HOSTS = [
  'cdn-images.toolify.ai',
  'www.toolify.ai'
] as const

// Output widths (px). A request is rounded up to one of these, so each image has
// a handful of cached sizes at most.
export const IMAGE_PROXY_WIDTHS = [64, 128, 256, 512, 1024, 1920] as const

export function snapImageWidth(width: number): number {
  return IMAGE_PROXY_WIDTHS.find(w => w >= width) ?? 1920 // the largest
}

// Our uploads (/uploads/…) or an https URL on one of the hosts above.
export function isProxiableImage(url: string): boolean {
  if (url.startsWith('/uploads/')) return true
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && (IMAGE_PROXY_HOSTS as readonly string[]).includes(parsed.hostname)
  } catch {
    return false
  }
}

// Hosts that refuse their images to other sites (403 to browsers too): URLs on them
// are dropped server-side (server/utils/toolImages.ts), so the page shows the tool's
// initials straight away instead of a request that fails on every view.
export const DEAD_IMAGE_HOSTS = [
  'cdn.futurepedia.io',
  'cdn2.futurepedia.io'
] as const
