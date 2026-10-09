<script setup lang="ts">
import { SOCIAL_QUERY_MAX_KEYWORDS } from '#shared/research'

// Dashboard → Social Listening: the user's saved queries (server/utils/socialQueries.ts).
// A query is 1–5 keywords matched against the crawled social posts; the plan caps how
// many are active at once. No Data Credits are spent.
const { t, locale } = useI18n()
const { authHeaders, isAdmin } = useAuth()
const upgradeModalOpen = useState('upgrade-modal-open', () => false)

interface QueryRow { id: string; name: string; keywords: string[]; active: boolean; overLimit: boolean; createdAt: string; results: number; fresh: number }
interface Post {
  id: string; platform: string; title: string | null; description: string | null; thumbnailUrl: string | null; url: string | null
  creator: string | null; publishedAt: string | null; views: number; likes: number; comments: number; shares: number
  tool: { slug: string; name: string | null }; isNew: boolean
}

const { data, refresh } = useFetch<{ items: QueryRow[]; active: number; limit: number }>('/api/social-queries', { headers: authHeaders() })
const queries = computed(() => data.value?.items ?? [])
const full = computed(() => !!data.value && data.value.active >= data.value.limit)

const busy = ref<string | null>(null)
const error = ref('')
async function call(key: string, fn: () => Promise<unknown>) {
  busy.value = key
  error.value = ''
  try {
    await fn()
    await Promise.all([refresh(), refreshNuxtData('my-plan')])
    return true
  } catch (e: any) {
    error.value = e?.data?.message || t('socialQueries.error')
    return false
  } finally {
    busy.value = null
  }
}

// Create / edit form: keywords typed comma-separated.
const editing = ref<{ id: string | null; name: string; keywords: string } | null>(null)
const parsedKeywords = computed(() => (editing.value?.keywords ?? '').split(',').map(k => k.trim()).filter(Boolean))
function startNew() { editing.value = { id: null, name: '', keywords: '' } }
function startEdit(q: QueryRow) { editing.value = { id: q.id, name: q.name, keywords: q.keywords.join(', ') } }
async function save() {
  const e = editing.value
  if (!e) return
  const body = { name: e.name, keywords: parsedKeywords.value }
  const done = await call('save', () => e.id
    ? $fetch(`/api/social-queries/${e.id}`, { method: 'PATCH', headers: authHeaders(), body })
    : $fetch('/api/social-queries', { method: 'POST', headers: authHeaders(), body }))
  if (done) editing.value = null
}
const setActive = (q: QueryRow, active: boolean) => call(q.id, () => $fetch(`/api/social-queries/${q.id}`, { method: 'PATCH', headers: authHeaders(), body: { active } }))
function remove(q: QueryRow) {
  if (!confirm(t('socialQueries.confirmDelete', { name: q.name }))) return
  if (openId.value === q.id) openId.value = null
  call(q.id, () => $fetch(`/api/social-queries/${q.id}`, { method: 'DELETE', headers: authHeaders() }))
}

// Results of one query, shown under it; "load more" appends the next page.
const openId = ref<string | null>(null)
const posts = ref<Post[]>([])
const postsPage = ref(1)
const postsPageCount = ref(0)
const postsLoading = ref(false)
async function loadPosts(id: string, page: number) {
  postsLoading.value = true
  try {
    const res = await $fetch<{ items: Post[]; page: number; pageCount: number }>(`/api/social-queries/${id}/results`, { headers: authHeaders(), query: { page } })
    if (openId.value !== id) return
    posts.value = page === 1 ? res.items : [...posts.value, ...res.items]
    postsPage.value = res.page
    postsPageCount.value = res.pageCount
    if (page === 1) refresh() // its "new" count is reset
  } catch (e: any) {
    error.value = e?.data?.message || t('socialQueries.error')
  } finally {
    postsLoading.value = false
  }
}
function toggleResults(q: QueryRow) {
  if (openId.value === q.id) { openId.value = null; return }
  openId.value = q.id
  posts.value = []
  loadPosts(q.id, 1)
}

const compact = (n: number) => new Intl.NumberFormat(locale.value, { notation: 'compact', maximumFractionDigits: 1 }).format(n)
const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(locale.value, { year: 'numeric', month: 'short', day: 'numeric' }) : '')
</script>

<template>
  <section class="mt-5 rounded-xl border border-ink-100 p-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="font-bold text-ink-900">🔎 {{ t('socialQueries.title') }}</h2>
        <p class="text-xs text-ink-500">{{ t('socialQueries.subtitle') }}</p>
      </div>
      <div class="flex items-center gap-3 text-sm">
        <span v-if="data" class="text-ink-600">{{ t('socialQueries.usage', { used: data.active, limit: data.limit }) }}</span>
        <button v-if="!full" type="button" class="rounded-lg bg-brand-500 px-3 py-2 font-semibold text-white hover:bg-brand-600" @click="startNew">+ {{ t('socialQueries.new') }}</button>
        <button v-else-if="!isAdmin" type="button" class="rounded-lg border border-brand-300 px-3 py-2 font-semibold text-brand-600 hover:bg-brand-50" @click="upgradeModalOpen = true">{{ t('admin.upgrade') }}</button>
      </div>
    </div>

    <form v-if="editing" class="mt-4 grid grid-cols-1 gap-3 rounded-lg bg-ink-100/40 p-4 text-sm md:grid-cols-[220px_1fr_auto]" @submit.prevent="save">
      <input v-model="editing.name" maxlength="80" :placeholder="t('socialQueries.namePlaceholder')" class="rounded-lg border border-ink-200 px-3 py-2 outline-none focus:border-brand-400">
      <div>
        <input v-model="editing.keywords" :placeholder="t('socialQueries.keywordsPlaceholder')" class="w-full rounded-lg border border-ink-200 px-3 py-2 outline-none focus:border-brand-400">
        <p :class="['mt-1 text-xs', parsedKeywords.length > SOCIAL_QUERY_MAX_KEYWORDS ? 'text-red-600' : 'text-ink-500']">
          {{ t('socialQueries.keywordsHint', { n: parsedKeywords.length, max: SOCIAL_QUERY_MAX_KEYWORDS }) }}
        </p>
      </div>
      <div class="flex items-start gap-2">
        <button type="submit" :disabled="busy === 'save'" class="rounded-lg bg-ink-900 px-4 py-2 font-semibold text-white hover:bg-ink-800 disabled:opacity-50">{{ t('socialQueries.save') }}</button>
        <button type="button" class="rounded-lg border border-ink-200 px-4 py-2 font-semibold text-ink-600" @click="editing = null">{{ t('socialQueries.cancel') }}</button>
      </div>
    </form>

    <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>
    <p v-if="data && !data.limit" class="mt-3 text-sm text-ink-600">{{ t('socialQueries.none') }}</p>

    <div v-if="queries.length" class="mt-4 divide-y divide-ink-100 rounded-lg border border-ink-100">
      <div v-for="q in queries" :key="q.id" :class="[!q.active && 'bg-ink-100/30']">
        <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-semibold text-ink-900">{{ q.name }}</span>
              <span v-if="!q.active" class="rounded-full bg-ink-200 px-2 py-0.5 text-[11px] font-semibold text-ink-600">{{ t('socialQueries.paused') }}</span>
              <button v-else-if="q.overLimit" type="button" class="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700" @click="upgradeModalOpen = true">🔒 {{ t('socialQueries.overLimit') }}</button>
              <span v-else-if="q.fresh" class="rounded-full bg-brand-500 px-2 py-0.5 text-[11px] font-semibold text-white">{{ t('socialQueries.newPosts', { n: q.fresh }) }}</span>
            </div>
            <div class="mt-1 flex flex-wrap gap-1">
              <span v-for="k in q.keywords" :key="k" class="rounded-full bg-ink-100 px-2 py-0.5 text-xs text-ink-700">{{ k }}</span>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-3 text-sm font-semibold">
            <span class="font-normal text-ink-500">{{ t('socialQueries.results', { n: q.results.toLocaleString(locale) }) }}</span>
            <button v-if="q.active && !q.overLimit" type="button" class="text-brand-600 hover:text-brand-700" @click="toggleResults(q)">{{ openId === q.id ? t('socialQueries.hide') : t('socialQueries.view') }}</button>
            <button type="button" class="text-ink-700 hover:text-brand-600" @click="startEdit(q)">{{ t('socialQueries.edit') }}</button>
            <button type="button" :disabled="busy === q.id" class="text-ink-700 hover:text-brand-600 disabled:opacity-50" @click="setActive(q, !q.active)">{{ q.active ? t('socialQueries.pause') : t('socialQueries.resume') }}</button>
            <button type="button" :disabled="busy === q.id" class="text-red-500 hover:text-red-600 disabled:opacity-50" @click="remove(q)">{{ t('socialQueries.delete') }}</button>
          </div>
        </div>

        <div v-if="openId === q.id" class="border-t border-ink-100 bg-white px-4 py-3">
          <p v-if="postsLoading && !posts.length" class="text-sm text-ink-400">{{ t('websiteInsights.loading') }}</p>
          <p v-else-if="!posts.length" class="text-sm text-ink-500">{{ t('socialQueries.noResults') }}</p>
          <div v-for="p in posts" :key="p.id" class="flex gap-3 border-b border-ink-100 py-3 last:border-0">
            <img v-if="p.thumbnailUrl" :src="p.thumbnailUrl" alt="" loading="lazy" class="h-14 w-24 shrink-0 rounded object-cover">
            <div class="min-w-0 flex-1 text-sm">
              <div class="flex flex-wrap items-center gap-2 text-xs text-ink-500">
                <span class="rounded bg-ink-100 px-1.5 py-0.5 font-semibold uppercase text-ink-700">{{ p.platform }}</span>
                <span v-if="p.creator">{{ p.creator }}</span>
                <span v-if="p.publishedAt">· {{ date(p.publishedAt) }}</span>
                <NuxtLink v-if="p.tool.name" :to="`/tools/${p.tool.slug}`" class="text-brand-600 hover:text-brand-700">· {{ p.tool.name }}</NuxtLink>
                <span v-if="p.isNew" class="rounded-full bg-brand-50 px-1.5 font-semibold text-brand-600">{{ t('socialQueries.new') }}</span>
              </div>
              <a v-if="p.url" :href="p.url" target="_blank" rel="noopener noreferrer nofollow" class="mt-1 block truncate font-semibold text-ink-900 hover:text-brand-600">{{ p.title || p.description || p.url }}</a>
              <p v-else class="mt-1 truncate font-semibold text-ink-900">{{ p.title || p.description }}</p>
              <p class="mt-1 text-xs text-ink-500">👁 {{ compact(p.views) }} · ♥ {{ compact(p.likes) }} · 💬 {{ compact(p.comments) }} · ↗ {{ compact(p.shares) }}</p>
            </div>
          </div>
          <button v-if="postsPage < postsPageCount" type="button" :disabled="postsLoading" class="mt-2 text-sm font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-50" @click="loadPosts(q.id, postsPage + 1)">{{ t('socialQueries.loadMore') }}</button>
        </div>
      </div>
    </div>
    <p v-else-if="data && data.limit" class="mt-4 text-sm text-ink-500">{{ t('socialQueries.empty') }}</p>
  </section>
</template>
