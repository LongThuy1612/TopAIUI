<script setup lang="ts">
import type { AdminGpt, GptStatus } from '~/types'
import { GPT_CATEGORIES } from '#shared/gpts'

const { t, locale } = useI18n()
definePageMeta({ layout: 'dashboard', middleware: ['auth', 'admin'] })
const { authHeaders } = useAuth()

// "review": paid GPTs waiting for a decision (oldest first) — the inbox.
const filter = ref<'review' | 'all'>('review')
const { data, refresh } = await useFetch<{ items: AdminGpt[] }>('/api/admin/gpts', {
  query: computed(() => ({ filter: filter.value })),
  headers: () => authHeaders(),
  watch: [filter]
})
const items = computed(() => data.value?.items ?? [])

// The listing being edited (one at a time) and its form.
const editingId = ref<string | null>(null)
const form = reactive({ name: '', description: '', content: '', iconUrl: '', author: '', category: 'other' })
const busyBody = ref(false)
function edit(g: AdminGpt) {
  editingId.value = g.id
  Object.assign(form, { name: g.name, description: g.description, content: g.content ?? '', iconUrl: g.iconUrl ?? '', author: g.author ?? '', category: g.category })
}

const busyId = ref<string | null>(null)
const actionError = ref('')
const notice = ref('')

async function run(id: string, fn: () => Promise<unknown>, done?: string) {
  busyId.value = id
  actionError.value = ''
  notice.value = ''
  try {
    await fn()
    await refresh()
    if (done) notice.value = done
    return true
  } catch (e: any) {
    actionError.value = e?.data?.message || t('admin.saveError')
    return false
  } finally {
    busyId.value = null
  }
}

const save = (g: AdminGpt) => run(g.id, () => $fetch(`/api/admin/gpts/${g.id}`, { method: 'PATCH', headers: authHeaders(), body: form }), t('adminArticles.saved'))
const act = (g: AdminGpt, body: Record<string, unknown>, done?: string) => run(g.id, () => $fetch(`/api/admin/gpts/${g.id}`, { method: 'POST', headers: authHeaders(), body }), done)

async function saveAndPublish(g: AdminGpt) {
  if (editingId.value === g.id && !await save(g)) return
  if (await act(g, { action: 'publish' }, t('adminGpts.published'))) editingId.value = null
}
async function refetch(g: AdminGpt) {
  await act(g, { action: 'refetch' }, t('adminGpts.refetched'))
  // The editor would otherwise still hold the old values and a Save would undo the fetch.
  const fresh = items.value.find(i => i.id === g.id)
  if (fresh && editingId.value === g.id) edit(fresh)
}
function reject(g: AdminGpt) {
  const reason = prompt(t('adminGpts.rejectPrompt'))?.trim()
  if (reason) act(g, { action: 'reject', reason }, t('adminGpts.rejected'))
}

async function uploadIcon(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const body = new FormData()
  body.append('file', file)
  try {
    form.iconUrl = (await $fetch<{ url: string }>('/api/admin/gpts/images', { method: 'POST', headers: authHeaders(), body })).url
  } catch (err: any) {
    actionError.value = err?.data?.message || t('admin.saveError')
  }
}

const statusClass: Record<GptStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700',
  PUBLISHED: 'bg-emerald-50 text-emerald-700',
  HIDDEN: 'bg-ink-100 text-ink-500',
  REJECTED: 'bg-red-50 text-red-600'
}
const fetchClass: Record<AdminGpt['fetchStatus'], string> = {
  QUEUED: 'text-ink-400',
  OK: 'text-emerald-600',
  NOT_FOUND: 'text-red-600',
  FAILED: 'text-amber-600'
}
const formatDate = (d: string) => new Date(d).toLocaleString(locale.value, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
const initials = (name: string) => name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'G'

useSeoMeta({ title: () => `${t('adminGpts.title')} — TopAICollection` })
</script>

<template>
  <div>
    <h1 class="flex items-center gap-2 text-xl font-extrabold text-ink-900"><span>🤖</span> {{ t('adminGpts.title') }}</h1>

    <div class="mt-5 flex flex-wrap items-center gap-2">
      <button
        v-for="f in (['review', 'all'] as const)"
        :key="f"
        type="button"
        :class="['rounded-full border px-3 py-1.5 text-sm font-semibold transition', filter === f ? 'border-brand-500 bg-brand-500 text-white' : 'border-ink-200 text-ink-600 hover:border-brand-300']"
        @click="filter = f"
      >
        {{ t(`adminGpts.filters.${f}`) }}
      </button>
    </div>
    <p v-if="actionError" class="mt-3 text-sm text-red-600">{{ actionError }}</p>
    <p v-if="notice" class="mt-3 text-sm text-emerald-600">{{ notice }}</p>

    <div class="mt-4 space-y-3">
      <div v-for="g in items" :key="g.id" class="rounded-xl border border-ink-100 p-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="flex min-w-0 flex-1 gap-3">
            <img v-if="g.iconUrl" :src="g.iconUrl" alt="" class="h-12 w-12 shrink-0 rounded-full object-cover">
            <span v-else class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-extrabold text-brand-500">{{ initials(g.name) }}</span>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-semibold text-ink-900">{{ g.name || (g.fetchStatus === 'QUEUED' ? t('myGPTsPage.fetching') : g.gizmoId || '—') }}</span>
                <span :class="['rounded-full px-2 py-0.5 text-[11px] font-semibold', statusClass[g.status]]">{{ t(`myGPTsPage.statuses.${g.status}`) }}</span>
                <span class="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-ink-600">{{ t(`gpts.categories.${g.category}`) }}</span>
                <span v-if="g.duplicates" class="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600">{{ t('adminGpts.duplicate', { n: g.duplicates }) }}</span>
              </div>
              <a :href="g.url" target="_blank" rel="noopener noreferrer nofollow" class="block truncate text-xs text-brand-600 hover:underline">{{ g.url }}</a>
              <div class="text-xs text-ink-400">
                {{ formatDate(g.createdAt) }} · {{ g.owner?.email ?? '—' }} ·
                <span :class="fetchClass[g.fetchStatus]">{{ t(`adminGpts.fetch.${g.fetchStatus}`) }}</span>
              </div>
              <p class="mt-1 line-clamp-2 text-sm text-ink-600">{{ g.description }}</p>
              <p v-if="g.rejectionReason" class="mt-1 text-xs text-red-600">{{ g.rejectionReason }}</p>
            </div>
          </div>

          <div class="flex flex-col items-end gap-1.5 text-sm font-semibold">
            <NuxtLinkLocale v-if="g.status === 'PUBLISHED'" :to="`/gpts/${g.slug}`" target="_blank" class="text-ink-700 hover:text-brand-600">{{ t('adminArticles.view') }} ↗</NuxtLinkLocale>
            <template v-if="g.status !== 'REJECTED'">
              <button type="button" class="text-ink-700 hover:text-brand-600" @click="editingId === g.id ? (editingId = null) : edit(g)">{{ editingId === g.id ? t('adminPosts.hide') : t('myPostsPage.edit') }}</button>
              <button type="button" :disabled="busyId === g.id" class="text-ink-700 hover:text-brand-600 disabled:opacity-50" @click="refetch(g)">{{ t('adminGpts.refetch') }}</button>
            </template>
            <button v-if="g.status === 'PENDING' || g.status === 'HIDDEN'" type="button" :disabled="busyId === g.id" class="text-emerald-600 hover:text-emerald-700 disabled:opacity-50" @click="saveAndPublish(g)">{{ t('adminGpts.publish') }}</button>
            <button v-if="g.status === 'PUBLISHED'" type="button" :disabled="busyId === g.id" class="text-ink-700 hover:text-brand-600 disabled:opacity-50" @click="act(g, { action: 'hide' })">{{ t('adminGpts.hide') }}</button>
            <button v-if="g.status === 'PENDING'" type="button" :disabled="busyId === g.id" class="text-red-500 hover:text-red-600 disabled:opacity-50" @click="reject(g)">{{ t('adminGpts.reject') }}</button>
          </div>
        </div>

        <div v-if="editingId === g.id" class="mt-4 space-y-4 border-t border-ink-100 pt-4">
          <div class="flex items-center gap-3">
            <img v-if="form.iconUrl" :src="form.iconUrl" alt="" class="h-14 w-14 rounded-full object-cover">
            <label class="cursor-pointer rounded-lg border border-ink-200 px-3 py-1.5 text-sm font-semibold text-ink-700 hover:border-brand-300">
              {{ t('adminGpts.changeIcon') }}
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="hidden" @change="uploadIcon">
            </label>
          </div>
          <div class="grid gap-4 sm:grid-cols-3">
            <label class="block sm:col-span-1">
              <span class="text-sm font-semibold text-ink-900">{{ t('admin.fieldName') }}</span>
              <input v-model="form.name" maxlength="120" class="mt-1.5 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400">
            </label>
            <label class="block">
              <span class="text-sm font-semibold text-ink-900">{{ t('adminArticles.author') }}</span>
              <input v-model="form.author" maxlength="80" class="mt-1.5 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400">
            </label>
            <label class="block">
              <span class="text-sm font-semibold text-ink-900">{{ t('admin.fieldCategory') }}</span>
              <select v-model="form.category" class="mt-1.5 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400">
                <option v-for="c in GPT_CATEGORIES" :key="c" :value="c">{{ t(`gpts.categories.${c}`) }}</option>
              </select>
            </label>
          </div>
          <label class="block">
            <span class="text-sm font-semibold text-ink-900">{{ t('admin.fieldShortDesc') }}</span>
            <textarea v-model="form.description" maxlength="600" rows="3" class="mt-1.5 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400" />
          </label>
          <div>
            <span class="text-sm font-semibold text-ink-900">{{ t('adminGpts.content') }}</span>
            <MarkdownEditor v-model="form.content" v-model:busy="busyBody" upload-url="/api/admin/gpts/images" :rows="10" class="mt-1.5" />
          </div>
          <div class="flex gap-3">
            <button type="button" :disabled="busyId === g.id || busyBody" class="rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-900 hover:border-brand-300 disabled:opacity-50" @click="save(g)">{{ t('admin.save') }}</button>
            <button v-if="g.status !== 'PUBLISHED'" type="button" :disabled="busyId === g.id || busyBody" class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50" @click="saveAndPublish(g)">{{ t('adminGpts.saveAndPublish') }}</button>
          </div>
        </div>
      </div>
      <p v-if="!items.length" class="rounded-xl border border-ink-100 py-12 text-center text-sm text-ink-400">{{ t(filter === 'review' ? 'adminGpts.emptyReview' : 'adminGpts.empty') }}</p>
    </div>
  </div>
</template>
