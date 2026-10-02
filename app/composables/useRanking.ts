import type { RankingFilters, RankingItem, RankingResponse } from '~/types'

const PAGE_SIZE = 50

/** First page via useFetch (server-rendered), further pages appended by loadMore(). */
export async function useRanking(params: MaybeRefOrGetter<Record<string, string | undefined>>) {
  const { locale } = useI18n()
  const query = computed(() => ({ ...toValue(params), locale: locale.value, limit: PAGE_SIZE }))

  // Start the fetch but set up refs and the watcher before awaiting it: code
  // after an `await` inside a composable no longer runs in the component's
  // setup context, so a watcher created there wouldn't be stopped on unmount.
  const request = useFetch<RankingResponse>('/api/ranking', { query })

  const more = ref<RankingItem[]>([])
  const page = ref(1)
  const loadingMore = ref(false)
  // Bumped on every filter change so a loadMore() still in flight for the
  // previous filter drops its result instead of appending it to the new list.
  let generation = 0
  watch(query, () => {
    generation++
    more.value = []
    page.value = 1
    loadingMore.value = false
  })

  const { data, pending } = await request

  // The server re-ranks hourly, so a later page can overlap an earlier one —
  // keep the first occurrence of each tool.
  const items = computed(() => {
    const seen = new Set<string>()
    return [...(data.value?.items ?? []), ...more.value].filter(item => !seen.has(item.slug) && seen.add(item.slug))
  })
  const hasMore = computed(() => page.value < (data.value?.pageCount ?? 1))

  async function loadMore() {
    if (loadingMore.value || !hasMore.value) return
    const current = generation
    loadingMore.value = true
    try {
      const res = await $fetch<RankingResponse>('/api/ranking', { query: { ...query.value, page: page.value + 1 } })
      if (current !== generation) return
      more.value.push(...res.items)
      page.value = res.page
    } finally {
      if (current === generation) loadingMore.value = false
    }
  }

  return { data, items, pending, hasMore, loadingMore, loadMore }
}

export function useRankingFilters() {
  const { locale } = useI18n()
  return useFetch<RankingFilters>('/api/ranking/filters', { query: computed(() => ({ locale: locale.value })) })
}

/** "2026-08" → "August 2026" in the UI language. */
export function formatRankingMonth(month: string | null | undefined, locale: string) {
  if (!month) return ''
  const [y, m] = month.split('-').map(Number) as [number, number]
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

/** "VN" → "Vietnam" in the UI language. */
export function countryName(code: string, locale: string) {
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(code) ?? code
  } catch {
    return code
  }
}
