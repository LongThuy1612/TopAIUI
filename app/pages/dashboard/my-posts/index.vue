<script setup lang="ts">
import type { MyPostSubmission, PostSubmissionStatus } from '~/types'
import { guestPost } from '~/data/promote'

const { t, locale } = useI18n()
definePageMeta({ layout: 'dashboard', middleware: 'auth' })
const { authHeaders } = useAuth()

// Credits come from paid guest-post orders (User.postCredits); submitting a guest post
// takes 2, a link insert 1 (server/utils/articles.ts). Rejected / withdrawn ones give them back.
const { data, refresh } = await useFetch<{ postCredits: number; items: MyPostSubmission[] }>('/api/me/posts', {
  key: 'my-posts',
  headers: () => authHeaders()
})
const credits = computed(() => data.value?.postCredits ?? 0)
const items = computed(() => data.value?.items ?? [])

const canPost = computed(() => credits.value >= guestPost.credits.GUEST_POST)
const canLink = computed(() => credits.value >= guestPost.credits.LINK_INSERT)

const statusClass: Record<PostSubmissionStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700',
  CHANGES_REQUESTED: 'bg-orange-50 text-orange-700',
  PUBLISHED: 'bg-emerald-50 text-emerald-700',
  REJECTED: 'bg-red-50 text-red-600',
  WITHDRAWN: 'bg-ink-100 text-ink-500'
}
const editable = (s: MyPostSubmission) => s.status === 'PENDING' || s.status === 'CHANGES_REQUESTED'
const editLink = (s: MyPostSubmission) => `/dashboard/my-posts/${s.type === 'GUEST_POST' ? 'post' : 'link'}?id=${s.id}`
const formatDate = (d: string) => new Date(d).toLocaleDateString(locale.value, { year: 'numeric', month: 'short', day: 'numeric' })

const busyId = ref<string | null>(null)
const actionError = ref('')
async function withdraw(s: MyPostSubmission) {
  if (!confirm(t('myPostsPage.withdrawConfirm', { n: s.credits }))) return
  busyId.value = s.id
  actionError.value = ''
  try {
    await $fetch(`/api/me/posts/${s.id}`, { method: 'DELETE', headers: authHeaders() })
    await refresh()
    refreshNuxtData('my-orders')
  } catch (e: any) {
    actionError.value = e?.data?.message || t('admin.saveError')
  } finally {
    busyId.value = null
  }
}

useSeoMeta({
  title: () => `${t('myPostsPage.title')} — TopAICollection`
})
</script>

<template>
  <div>
    <h1 class="text-xl font-extrabold text-ink-900">{{ t('myPostsPage.title') }}</h1>

    <div class="mt-4 flex flex-wrap items-center gap-3">
      <NuxtLinkLocale
        :to="canPost ? '/dashboard/my-posts/post' : '/post-or-insert'"
        class="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
      >
        {{ t('myPostsPage.createNewPost') }}
      </NuxtLinkLocale>
      <NuxtLinkLocale
        :to="canLink ? '/dashboard/my-posts/link' : '/post-or-insert'"
        class="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
      >
        {{ t('myPostsPage.createNewLinkInsert') }}
      </NuxtLinkLocale>
      <span class="text-sm text-ink-900">
        <span class="font-bold">{{ t('myPostsPage.myCredits') }}: {{ credits }}</span>
        {{ t('myPostsPage.creditsHint') }}
      </span>
      <NuxtLinkLocale to="/post-or-insert" class="rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-900 hover:border-brand-300">
        {{ t('myPostsPage.buyMore') }}
      </NuxtLinkLocale>
    </div>
    <p v-if="!canLink" class="mt-2 text-xs text-ink-500">{{ t('myPostsPage.noCredits') }}</p>
    <p v-if="actionError" class="mt-3 text-sm text-red-600">{{ actionError }}</p>

    <div class="mt-5 overflow-x-auto rounded-xl border border-ink-100">
      <table class="w-full min-w-[760px] text-left text-sm">
        <thead class="bg-ink-100/40 text-xs font-bold uppercase tracking-wide text-ink-900">
          <tr>
            <th class="px-4 py-3">{{ t('myPostsPage.colPost') }}</th>
            <th class="px-4 py-3">{{ t('myPostsPage.colArticleLink') }}</th>
            <th class="px-4 py-3">{{ t('myPostsPage.colType') }}</th>
            <th class="px-4 py-3">{{ t('myPostsPage.colStatus') }}</th>
            <th class="px-4 py-3 text-right" />
          </tr>
        </thead>
        <tbody v-if="items.length">
          <tr v-for="s in items" :key="s.id" class="border-t border-ink-100 align-top">
            <td class="max-w-[300px] px-4 py-3">
              <div class="font-semibold text-ink-900">
                {{ s.type === 'GUEST_POST' ? s.title : s.anchorText }}
              </div>
              <a v-if="s.targetUrl" :href="s.targetUrl" target="_blank" rel="noopener noreferrer nofollow" class="block truncate text-xs text-brand-600 hover:underline">{{ s.targetUrl }}</a>
              <div class="mt-1 text-xs text-ink-400">{{ formatDate(s.submittedAt) }} · {{ t('myPostsPage.creditsUsed', { n: s.credits }) }}</div>
            </td>
            <td class="max-w-[260px] px-4 py-3">
              <NuxtLinkLocale v-if="s.article" :to="`/ai-news/${s.article.slug}`" target="_blank" class="text-brand-600 hover:underline">{{ s.article.title }}</NuxtLinkLocale>
              <span v-else-if="s.type === 'LINK_INSERT'" class="text-xs text-ink-500">{{ s.articleId ? t('myPostsPage.requestedArticle') : t('myPostsPage.editorPicks') }}</span>
              <span v-else class="text-ink-300">—</span>
            </td>
            <td class="whitespace-nowrap px-4 py-3 text-ink-700">{{ t(`myPostsPage.types.${s.type}`) }}</td>
            <td class="w-[220px] px-4 py-3">
              <span :class="['whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold', statusClass[s.status]]">{{ t(`myPostsPage.statuses.${s.status}`) }}</span>
              <p v-if="s.adminNote && (s.status === 'CHANGES_REQUESTED' || s.status === 'REJECTED')" class="mt-1.5 whitespace-pre-line text-xs text-ink-600">
                <b>{{ t('myPostsPage.editorNote') }}:</b> {{ s.adminNote }}
              </p>
              <p v-if="s.status === 'REJECTED' || s.status === 'WITHDRAWN'" class="mt-1 text-xs text-ink-400">{{ t('myPostsPage.refunded', { n: s.credits }) }}</p>
            </td>
            <td class="whitespace-nowrap px-4 py-3 text-right">
              <div v-if="editable(s)" class="flex flex-col items-end gap-1.5 text-sm font-semibold">
                <NuxtLinkLocale :to="editLink(s)" class="text-brand-600 hover:text-brand-700">
                  {{ s.status === 'CHANGES_REQUESTED' ? t('myPostsPage.editResubmit') : t('myPostsPage.edit') }}
                </NuxtLinkLocale>
                <button type="button" :disabled="busyId === s.id" class="text-ink-500 hover:text-red-600 disabled:opacity-50" @click="withdraw(s)">
                  {{ t('myPostsPage.withdraw') }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="!items.length" class="flex flex-col items-center gap-4 py-16">
        <p class="text-sm text-ink-900">{{ t('myPostsPage.emptyMessage') }}</p>
      </div>
    </div>
  </div>
</template>
