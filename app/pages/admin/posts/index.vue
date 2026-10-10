<script setup lang="ts">
import type { AdminArticleRow, AdminPostSubmission, PostSubmissionStatus } from '~/types'
import { guestPost } from '~/data/promote'
import { markdownRenderer } from '#shared/markdown'

const { t, locale } = useI18n()
definePageMeta({ layout: 'dashboard', middleware: ['auth', 'admin'] })
const { authHeaders } = useAuth()

// "review": submissions waiting for a decision (oldest first) — the inbox.
const filter = ref<'review' | 'all'>('review')
const renderer = markdownRenderer(guestPost.linkRel)
const [{ data, refresh }, { data: articlesRes, refresh: refreshArticles }] = await Promise.all([
  useFetch<{ items: AdminPostSubmission[] }>('/api/admin/posts', {
    query: computed(() => ({ filter: filter.value })),
    headers: authHeaders(),
    watch: [filter]
  }),
  useFetch<{ items: AdminArticleRow[] }>('/api/admin/articles', { headers: authHeaders() })
])
const items = computed(() => data.value?.items ?? [])
// Words / links of each guest post, computed once per response (not on every render).
const statsOf = computed(() => Object.fromEntries(items.value.map(s => [s.id, renderer.stats(s.content ?? '')])))
const published = computed(() => (articlesRes.value?.items ?? []).filter(a => a.status === 'PUBLISHED'))

const openId = ref<string | null>(null)
// Link insert → the article it goes into (defaults to the one the customer asked for).
const doneArticle = reactive<Record<string, string>>({})

const busyId = ref<string | null>(null)
const actionError = ref('')

async function act(s: AdminPostSubmission, body: Record<string, unknown>) {
  busyId.value = s.id
  actionError.value = ''
  try {
    const res = await $fetch<{ articleSlug?: string }>(`/api/admin/posts/${s.id}`, { method: 'POST', headers: authHeaders(), body })
    await Promise.all([refresh(), refreshArticles()])
    if (res.articleSlug && body.action === 'publish') window.open(`/ai-news/${res.articleSlug}`, '_blank')
  } catch (e: any) {
    actionError.value = e?.data?.message || t('admin.saveError')
  } finally {
    busyId.value = null
  }
}
function withNote(s: AdminPostSubmission, action: 'requestChanges' | 'reject') {
  const note = prompt(t(action === 'reject' ? 'adminPosts.rejectPrompt' : 'adminPosts.changesPrompt'))?.trim()
  if (note) act(s, { action, note })
}
function markDone(s: AdminPostSubmission) {
  const articleId = doneArticle[s.id] ?? s.articleId ?? ''
  if (!articleId) { actionError.value = t('adminPosts.pickArticle'); return }
  act(s, { action: 'done', articleId })
}

const statusClass: Record<PostSubmissionStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700',
  CHANGES_REQUESTED: 'bg-orange-50 text-orange-700',
  PUBLISHED: 'bg-emerald-50 text-emerald-700',
  REJECTED: 'bg-red-50 text-red-600',
  WITHDRAWN: 'bg-ink-100 text-ink-500'
}
const formatDate = (d: string) => new Date(d).toLocaleString(locale.value, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

useSeoMeta({ title: () => `${t('adminPosts.title')} — TopAICollection` })
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="flex items-center gap-2 text-xl font-extrabold text-ink-900"><span>📝</span> {{ t('adminPosts.title') }}</h1>
      <NuxtLink to="/admin/articles" class="rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-900 hover:border-brand-300">{{ t('adminArticles.title') }}</NuxtLink>
    </div>

    <div class="mt-5 flex flex-wrap items-center gap-2">
      <button
        v-for="f in (['review', 'all'] as const)"
        :key="f"
        type="button"
        :class="['rounded-full border px-3 py-1.5 text-sm font-semibold transition', filter === f ? 'border-brand-500 bg-brand-500 text-white' : 'border-ink-200 text-ink-600 hover:border-brand-300']"
        @click="filter = f"
      >
        {{ t(`adminPosts.filters.${f}`) }}
      </button>
    </div>
    <p v-if="actionError" class="mt-3 text-sm text-red-600">{{ actionError }}</p>

    <div class="mt-4 space-y-3">
      <div v-for="s in items" :key="s.id" class="rounded-xl border border-ink-100 p-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-ink-600">{{ t(`myPostsPage.types.${s.type}`) }}</span>
              <span :class="['rounded-full px-2 py-0.5 text-[11px] font-semibold', statusClass[s.status]]">{{ t(`myPostsPage.statuses.${s.status}`) }}</span>
              <span class="text-xs text-ink-400">{{ formatDate(s.submittedAt) }} · {{ s.user.email }}</span>
            </div>
            <template v-if="s.type === 'GUEST_POST'">
              <div class="mt-2 font-semibold text-ink-900">{{ s.title }}</div>
              <div v-if="s.content != null" class="text-xs text-ink-500">{{ t('articleEditor.words', { n: statsOf[s.id]?.words ?? 0 }) }} · {{ t('articleEditor.links', { n: statsOf[s.id]?.externalLinks.length ?? 0, max: guestPost.maxLinks }) }}</div>
              <div class="mt-1 flex flex-wrap gap-x-3 text-xs">
                <a v-for="l in statsOf[s.id]?.externalLinks ?? []" :key="l" :href="l" target="_blank" rel="noopener noreferrer nofollow" class="break-all text-brand-600 hover:underline">{{ l }}</a>
              </div>
            </template>
            <template v-else>
              <div class="mt-2 text-sm text-ink-900"><b>{{ s.anchorText }}</b> → <a :href="s.targetUrl ?? '#'" target="_blank" rel="noopener noreferrer nofollow" class="break-all text-brand-600 hover:underline">{{ s.targetUrl }}</a></div>
              <div class="text-xs text-ink-500">{{ t('adminPosts.requested') }}: {{ s.article ? s.article.title : t('linkForm.editorChooses') }}</div>
              <p v-if="s.note" class="mt-1 whitespace-pre-line text-xs text-ink-600">{{ s.note }}</p>
            </template>
            <NuxtLink v-if="s.status === 'PUBLISHED' && s.article" :to="`/ai-news/${s.article.slug}`" target="_blank" class="mt-1 block text-xs font-semibold text-emerald-700 hover:underline">{{ s.article.title }} ↗</NuxtLink>
            <p v-if="s.adminNote" class="mt-1 whitespace-pre-line text-xs text-ink-500"><b>{{ t('myPostsPage.editorNote') }}:</b> {{ s.adminNote }}</p>
          </div>

          <div v-if="s.status === 'CHANGES_REQUESTED'" class="text-sm font-semibold">
            <button type="button" :disabled="busyId === s.id" class="text-red-500 hover:text-red-600 disabled:opacity-50" @click="withNote(s, 'reject')">{{ t('adminPosts.reject') }}</button>
          </div>
          <div v-if="s.status === 'PENDING'" class="flex flex-col items-end gap-1.5 text-sm font-semibold">
            <template v-if="s.type === 'GUEST_POST'">
              <button type="button" class="text-ink-700 hover:text-brand-600" @click="openId = openId === s.id ? null : s.id">{{ openId === s.id ? t('adminPosts.hide') : t('adminPosts.preview') }}</button>
              <button type="button" :disabled="busyId === s.id" class="text-emerald-600 hover:text-emerald-700 disabled:opacity-50" @click="act(s, { action: 'publish' })">{{ t('adminPosts.publish') }}</button>
            </template>
            <template v-else>
              <select
                :value="doneArticle[s.id] ?? s.articleId ?? ''"
                class="max-w-[260px] rounded-lg border border-ink-200 px-2 py-1 text-xs font-normal"
                @change="doneArticle[s.id] = ($event.target as HTMLSelectElement).value"
              >
                <option value="">{{ t('adminPosts.pickArticle') }}</option>
                <option v-for="a in published" :key="a.id" :value="a.id">{{ a.title }}</option>
              </select>
              <NuxtLink v-if="doneArticle[s.id] ?? s.articleId" :to="`/admin/articles/${doneArticle[s.id] ?? s.articleId}`" target="_blank" class="text-xs text-ink-700 hover:text-brand-600">{{ t('adminPosts.editArticle') }} ↗</NuxtLink>
              <button type="button" :disabled="busyId === s.id" class="text-emerald-600 hover:text-emerald-700 disabled:opacity-50" @click="markDone(s)">{{ t('adminPosts.markDone') }}</button>
            </template>
            <button type="button" :disabled="busyId === s.id" class="text-orange-600 hover:text-orange-700 disabled:opacity-50" @click="withNote(s, 'requestChanges')">{{ t('adminPosts.requestChanges') }}</button>
            <button type="button" :disabled="busyId === s.id" class="text-red-500 hover:text-red-600 disabled:opacity-50" @click="withNote(s, 'reject')">{{ t('adminPosts.reject') }}</button>
          </div>
        </div>

        <div v-if="openId === s.id && s.type === 'GUEST_POST'" class="mt-4 border-t border-ink-100 pt-4">
          <img v-if="s.coverUrl" :src="s.coverUrl" alt="" class="aspect-[16/9] w-full max-w-xl rounded-xl object-cover">
          <p v-if="s.excerpt" class="mt-3 text-sm italic text-ink-600">{{ s.excerpt }}</p>
          <ArticleBody :html="renderer.render(s.content ?? '')" class="mt-4 max-w-3xl" />
        </div>
      </div>
      <p v-if="!items.length" class="rounded-xl border border-ink-100 py-12 text-center text-sm text-ink-400">{{ t(filter === 'review' ? 'adminPosts.emptyReview' : 'adminPosts.empty') }}</p>
    </div>
  </div>
</template>
