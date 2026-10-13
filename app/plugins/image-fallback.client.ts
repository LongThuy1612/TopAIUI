// A resized imgix URL (sizedImage) can fail the first time that size is asked
// for (imgix answers 503 while rendering it). Fall back to the original image
// once instead of showing a broken logo.
export default defineNuxtPlugin(() => {
  document.addEventListener('error', (e) => {
    const img = e.target
    if (!(img instanceof HTMLImageElement) || img.dataset.sizedFallback) return
    let url: URL
    try {
      url = new URL(img.currentSrc || img.src)
    } catch {
      return
    }
    if (!/(^|\.)imgix\.net$/.test(url.hostname) || !url.searchParams.has('auto')) return
    img.dataset.sizedFallback = '1'
    for (const key of ['w', 'h', 'fit', 'auto']) url.searchParams.delete(key)
    img.src = url.toString()
  }, true) // error events don't bubble; listen in the capture phase
})
