import { isProxiableImage, snapImageWidth } from '#shared/images'

// Remote tool images (logos, screenshots) are often full-size originals — an
// imported "logo" can be a 2 MB product screenshot shown at 36 px. imgix hosts
// resize through URL parameters; a few other hosts (and our uploads) go through our
// own resizer, /img (server/routes/img.get.ts); any other URL is returned as is.
const RESIZING_HOST = /(^|\.)imgix\.net$/

// `width`/`height` in CSS pixels; requested at 2× for high-density screens.
// With a height the image is cropped to that box (like object-cover); without,
// it is scaled to the width. Ask for the same size wherever one card shows the same
// image twice (a logo and its faded copy behind it): one URL, one request.
export function sizedImage(url: string | null | undefined, width: number, height?: number): string | undefined {
  if (!url) return undefined
  if (isProxiableImage(url)) {
    const params = new URLSearchParams({ u: url, w: String(snapImageWidth(width * 2)) })
    // Square box (logos): cropped to a square so a wide original stays sharp.
    if (height === width) params.set('c', '1')
    return `/img?${params}`
  }
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return url // relative (/uploads/…) or malformed
  }
  if (!RESIZING_HOST.test(parsed.hostname)) return url
  parsed.searchParams.set('w', String(width * 2))
  if (height) {
    parsed.searchParams.set('h', String(height * 2))
    parsed.searchParams.set('fit', 'crop')
  } else {
    parsed.searchParams.set('fit', 'max')
  }
  parsed.searchParams.set('auto', 'format,compress')
  return parsed.toString()
}
