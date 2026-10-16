// The ▲ upvote of the tool lists (POST /api/tools/<slug>/upvote). Lists are cached for
// every visitor, so which tools this viewer has upvoted is asked separately
// (GET /api/me/upvotes) and counts changed here override the listed ones. A guest's
// click goes to the login page and the vote is cast on the way back.
const PENDING_KEY = 'topainew:pending-upvote'

export function useUpvotes() {
  const { t } = useI18n()
  const { token, authHeaders, load: loadAuth, logout } = useAuth()
  const { show } = useToast()
  const route = useRoute()
  const localePath = useLocalePath()
  // Per signed-in account: `owner` is the token they belong to, so signing out or in as
  // someone else (no page reload) never shows another account's votes.
  const voted = useState<Record<string, boolean>>('upvotes-voted', () => ({}))
  const counts = useState<Record<string, number>>('upvotes-counts', () => ({}))
  const owner = useState<string | null>('upvotes-owner', () => null)
  const busy = ref<string | null>(null)
  let shownSlugs: string[] = []

  function forgetIfOtherAccount() {
    if (owner.value === token.value) return
    owner.value = token.value
    voted.value = {}
  }

  // Which of these tools the viewer has upvoted (browser only; nothing for guests). Also
  // casts a vote a guest asked for before logging in, if that tool is on this page.
  const inFlight = new Set<string>()
  async function loadVoted(slugs: string[]) {
    if (!import.meta.client) return
    shownSlugs = slugs
    loadAuth()
    forgetIfOtherAccount()
    if (!token.value) return
    const ask = slugs.filter(s => !(s in voted.value) && !inFlight.has(s)).slice(0, 100)
    if (ask.length) {
      ask.forEach(s => inFlight.add(s))
      try {
        const res = await $fetch<{ slugs: string[] }>('/api/me/upvotes', { query: { slugs: ask.join(',') }, headers: authHeaders() })
        const mine = new Set(res.slugs)
        for (const s of ask) voted.value[s] = mine.has(s)
      } catch {} finally {
        ask.forEach(s => inFlight.delete(s))
      }
    }
    let pending: string | null = null
    try { pending = sessionStorage.getItem(PENDING_KEY) } catch {}
    if (pending && slugs.includes(pending)) {
      try { sessionStorage.removeItem(PENDING_KEY) } catch {}
      if (!voted.value[pending]) await setVote({ slug: pending }, true)
    }
  }

  const countOf = (tool: { slug: string; upvoteCount?: number | null }) => counts.value[tool.slug] ?? tool.upvoteCount ?? 0
  const isVoted = (slug: string) => !!voted.value[slug]

  async function setVote(tool: { slug: string; upvoteCount?: number | null }, on: boolean) {
    if (busy.value === tool.slug) return
    busy.value = tool.slug
    const before = { on: isVoted(tool.slug), count: countOf(tool) }
    // Shown at once; put back if the server says no.
    voted.value[tool.slug] = on
    if (on !== before.on) counts.value[tool.slug] = Math.max(0, before.count + (on ? 1 : -1))
    try {
      const res = await $fetch<{ upvoted: boolean; count: number }>(`/api/tools/${encodeURIComponent(tool.slug)}/upvote`, {
        method: 'POST', body: { on }, headers: authHeaders()
      })
      voted.value[tool.slug] = res.upvoted
      counts.value[tool.slug] = res.count
    } catch (e: any) {
      voted.value[tool.slug] = before.on
      counts.value[tool.slug] = before.count
      if (e?.statusCode === 401) {
        logout()
        await navigateTo(localePath({ path: '/login', query: { redirect: route.fullPath } }))
      } else if (e?.statusCode === 403) {
        show(t('home.voteVerify'), { type: 'error', duration: 6000 })
      } else if (e?.statusCode === 429) {
        show(t('home.voteTooFast'), { type: 'error' })
      } else {
        show(t('home.voteFailed'), { type: 'error' })
      }
    } finally {
      busy.value = null
    }
  }

  async function toggle(tool: { slug: string; upvoteCount?: number | null }) {
    loadAuth()
    forgetIfOtherAccount()
    if (!token.value) {
      try { sessionStorage.setItem(PENDING_KEY, tool.slug) } catch {}
      await navigateTo(localePath({ path: '/login', query: { redirect: route.fullPath } }))
      return
    }
    await setVote(tool, !isVoted(tool.slug))
  }

  // Signed out, or in as someone else, on this page: refresh the arrows shown.
  if (import.meta.client) {
    watch(token, () => {
      forgetIfOtherAccount()
      if (shownSlugs.length) loadVoted(shownSlugs)
    })
  }

  return { loadVoted, countOf, isVoted, toggle, busy }
}
