// Remote tool images (logos, screenshots) are often full-size originals — an
// imported "logo" can be a 2 MB product screenshot shown at 36 px. Hosts that
// resize on the fly get a sized, compressed URL; any other URL is returned as is.
const RESIZING_HOST = /(^|\.)imgix\.net$/

// `width`/`height` in CSS pixels; requested at 2× for high-density screens.
// With a height the image is cropped to that box (like object-cover); without,
// it is scaled to the width.
export function sizedImage(url: string | null | undefined, width: number, height?: number): string | undefined {
  if (!url) return undefined
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
