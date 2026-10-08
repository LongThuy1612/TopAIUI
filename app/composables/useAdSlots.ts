import type { WatchSource } from 'vue'
import type { AdPlacement, AdSlot } from '~/types'
import { advertise } from '~/data/promote'

// One row / card of a list page: an organic tool, or a sponsored slot (`ad`).
export interface AdFeedItem<T> { key: string; tool: T | AdSlot['tool']; ad?: AdSlot }

// Sponsored slots for one list page (GET /api/ads/slots). Loaded in the browser only:
// list pages are served from the HTML cache, and slots must rotate on every view.
//
// Render each slot with data-ad-slot="<campaignId>" and data-ad-placement="<placement>";
// once a slot is half on screen its impression is counted (batched, once per load).
// `rerender`: anything that re-creates the slot elements (grid ↔ list switch, the list
// changing — a filter hiding and showing the banner again).
// feed(tools): the list with the slots placed at `positions` (default
// advertise.slotPositions: 1, 4, 12); slots beyond them, and positions the list
// doesn't reach, are left out. `limit`: fetch more slots than `positions` places, for
// other spots on the same page (slots[positions.length…]).
export function useAdSlots(
  placement: AdPlacement,
  opts: { category?: () => string | undefined; exclude?: () => string | undefined; rerender?: WatchSource; positions?: number[]; limit?: number } = {}
) {
  const positions = opts.positions ?? advertise.slotPositions
  const { locale } = useI18n()
  const slots = ref<AdSlot[]>([])

  let observer: IntersectionObserver | null = null
  let timer: ReturnType<typeof setTimeout> | undefined
  const seen = new Set<string>()
  let queue: string[] = []

  function flush() {
    if (!queue.length) return
    const ids = queue
    queue = []
    $fetch('/api/ads/impressions', { method: 'POST', body: { ids } }).catch(() => {})
  }

  async function observe() {
    observer?.disconnect()
    await nextTick()
    if (!slots.value.length || typeof IntersectionObserver === 'undefined') return
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const id = (entry.target as HTMLElement).dataset.adSlot
        if (!entry.isIntersecting || !id || seen.has(id)) continue
        seen.add(id)
        queue.push(id)
        observer?.unobserve(entry.target)
      }
      clearTimeout(timer)
      timer = setTimeout(flush, 1000)
    }, { threshold: 0.5 })
    document.querySelectorAll<HTMLElement>(`[data-ad-placement="${placement}"]`).forEach(el => observer!.observe(el))
  }

  let request = 0
  async function load() {
    const mine = ++request
    let items: AdSlot[] = []
    try {
      const res = await $fetch<{ items: AdSlot[] }>('/api/ads/slots', {
        query: { placement, category: opts.category?.(), exclude: opts.exclude?.(), locale: locale.value, limit: opts.limit ?? positions.length }
      })
      items = res.items
    } catch {
      // ads never break the page
    }
    if (mine !== request) return // a newer load (category / language changed) wins
    slots.value = items
    seen.clear()
    observe()
  }

  onMounted(() => {
    load()
    // (exclude: moving from one tool page to another reuses the page component)
    watch([locale, () => opts.category?.(), () => opts.exclude?.()], load)
    if (opts.rerender) watch(opts.rerender, observe)
  })
  onBeforeUnmount(() => {
    observer?.disconnect()
    clearTimeout(timer)
    flush()
  })

  // A sponsored tool is taken out of the organic list only when its slot is actually
  // placed — otherwise it would vanish from the page. Placing fewer slots only lengthens
  // the list, so a second pass with just the placed ones places them all again.
  function feed<T extends { slug: string }>(tools: T[]): AdFeedItem<T>[] {
    const build = (ads: AdSlot[]) => {
      const hidden = new Set(ads.map(ad => ad.tool.slug))
      const items: AdFeedItem<T>[] = tools.filter(tool => !hidden.has(tool.slug)).map(tool => ({ key: tool.slug, tool }))
      const placed: AdSlot[] = []
      ads.forEach((ad, i) => {
        const at = positions[i]! - 1
        if (at > items.length) return
        items.splice(at, 0, { key: `ad-${ad.campaignId}`, tool: ad.tool, ad })
        placed.push(ad)
      })
      return { items, placed }
    }
    const first = build(slots.value.slice(0, positions.length))
    return first.placed.length === Math.min(slots.value.length, positions.length) ? first.items : build(first.placed).items
  }

  return { slots, feed }
}
