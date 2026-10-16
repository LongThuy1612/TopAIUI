// Broken tool images, in two steps:
// 1. A resized URL (sizedImage: an imgix URL with size parameters, or our /img
//    resizer) that fails falls back to the original image once — imgix can answer
//    503 the first time a size is asked for, and /img answers 404 for a source it
//    can't read.
// 2. A tool logo (an <img data-logo>) whose original fails too shows the tool's
//    initials (from its alt text) instead of a broken-image icon; a decorative one
//    (empty alt, e.g. the faded logo behind a card) is hidden.
export default defineNuxtPlugin(() => {
  // Not before hydration is done: hydrating sets each <img src> again from the
  // server-rendered props, undoing a swap made earlier. Images that failed before
  // then (or before this script ran at all) are picked up by the sweep below.
  let ready = false
  document.addEventListener('error', (e) => {
    if (ready && e.target instanceof HTMLImageElement) recover(e.target)
  }, true) // error events don't bubble; listen in the capture phase

  onNuxtReady(() => {
    ready = true
    for (const img of document.images) {
      if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) recover(img)
    }
  })
})

function recover(img: HTMLImageElement) {
  if (!img.dataset.sizedFallback) {
    const original = originalOf(img.currentSrc || img.src)
    if (original) {
      img.dataset.sizedFallback = '1'
      img.src = original
      return
    }
  }

  if (img.hasAttribute('data-logo') && !img.dataset.logoFallback) {
    img.dataset.logoFallback = '1'
    img.removeAttribute('srcset')
    if (img.alt.trim()) img.src = initialsAvatar(img.alt)
    else img.style.visibility = 'hidden'
  }
}

// The image a sizedImage() URL was made from, or null if it isn't one.
function originalOf(src: string): string | null {
  let url: URL
  try {
    url = new URL(src, location.href)
  } catch {
    return null
  }
  if (url.origin === location.origin && url.pathname === '/img') return url.searchParams.get('u')
  if (/(^|\.)imgix\.net$/.test(url.hostname) && url.searchParams.has('auto')) {
    for (const key of ['w', 'h', 'fit', 'auto']) url.searchParams.delete(key)
    return url.toString()
  }
  return null
}

// Same look as the initials shown for tools without a logo.
function initialsAvatar(name: string): string {
  const initials = name.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase() || 'AI'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#FFF3F0"/><text x="32" y="41" font-family="system-ui,sans-serif" font-size="24" font-weight="800" fill="#E45937" text-anchor="middle">${initials.replace(/[<&>"]/g, '')}</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
