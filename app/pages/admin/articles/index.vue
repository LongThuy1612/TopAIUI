<script setup lang="ts">
import type { AdminArticleRow } from '~/types'

const { t, locale } = useI18n()
definePageMeta({ layout: 'dashboard', middleware: ['auth', 'admin'] })
const { authHeaders } = useAuth()

const { data } = await useFetch<{ items: AdminArticleRow[] }>('/api/admin/articles', { headers: () => authHeaders() })
const items = computed(() => data.value?.items ?? [])
const formatDate = (d: string | null) => (d ? new Date(d).toLocaleDateString(locale.value, { year: 'numeric', month: 'short', day: 'numeric' }) : '—')

useSeoMeta({ title: () => `${t('adminArticles.title')} — TopAICollection` })
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="flex items-center gap-2 text-xl font-extrabold text-ink-900"><span>📰</span> {{ t('adminArticles.title') }}</h1>
      <div class="flex gap-2">
        <NuxtLinkLocale to="/admin/posts" class="rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-900 hover:border-brand-300">{{ t('adminPosts.title') }}</NuxtLinkLocale>
        <NuxtLinkLocale to="/admin/articles/new" class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">{{ t('adminArticles.new') }}</NuxtLinkLocale>
      </div>
    </div>

    <div class="mt-5 overflow-x-auto rounded-xl border border-ink-100">
      <table class="w-full min-w-[760px] text-left text-sm">
        <thead class="bg-ink-100/40 text-xs uppercase tracking-wide text-ink-400">
          <tr>
            <th class="px-4 py-3">{{ t('adminArticles.colTitle') }}</th>
            <th class="px-4 py-3">{{ t('adminArticles.colKind') }}</th>
            <th class="px-4 py-3">{{ t('adminArticles.colStatus') }}</th>
            <th class="px-4 py-3">{{ t('adminArticles.colPublished') }}</th>
            <th class="px-4 py-3 text-right">{{ t('adminArticles.colLinks') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in items" :key="a.id" class="border-t border-ink-100">
            <td class="max-w-[420px] px-4 py-3">
              <NuxtLinkLocale :to="`/admin/articles/${a.id}`" class="font-semibold text-ink-900 hover:text-brand-600">{{ a.title }}</NuxtLinkLocale>
              <div class="truncate text-xs text-ink-400">{{ a.externalUrl ? `↗ ${a.externalUrl}` : `/ai-news/${a.slug}` }}<template v-if="a.authorName"> · {{ a.authorName }}</template></div>
            </td>
            <td class="whitespace-nowrap px-4 py-3 text-ink-700">{{ t(`adminArticles.kinds.${a.kind}`) }}</td>
            <td class="px-4 py-3">
              <span :class="['rounded-full px-2.5 py-0.5 text-xs font-semibold', a.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-700' : 'bg-ink-100 text-ink-600']">{{ t(`adminArticles.statuses.${a.status}`) }}</span>
            </td>
            <td class="whitespace-nowrap px-4 py-3 text-ink-600">{{ formatDate(a.publishedAt) }}</td>
            <td class="px-4 py-3 text-right text-ink-600">{{ a._count.submissions || '' }}</td>
          </tr>
        </tbody>
      </table>
      <p v-if="!items.length" class="py-12 text-center text-sm text-ink-400">{{ t('adminArticles.empty') }}</p>
    </div>
  </div>
</template>
