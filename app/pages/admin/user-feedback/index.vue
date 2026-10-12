<script setup lang="ts">
import type { AdminFeedback, AdminFeedbackResponse, FeedbackStatus, FeedbackType } from '~/types'

const { t, locale } = useI18n()
definePageMeta({ layout: 'dashboard', middleware: ['auth', 'admin'] })
const { authHeaders } = useAuth()

const STATUSES: FeedbackStatus[] = ['NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']
const TYPES: FeedbackType[] = ['FEATURE', 'ISSUE', 'BILLING', 'OTHER']

const searchQuery = ref('')
// New first — that's the inbox.
const statusFilter = ref<'' | FeedbackStatus>('NEW')
const typeFilter = ref<'' | FeedbackType>('')
const page = ref(1)

watch([searchQuery, statusFilter, typeFilter], () => { page.value = 1 })

const { data, refresh } = await useFetch<AdminFeedbackResponse>('/api/admin/feedback', {
  query: computed(() => ({
    q: searchQuery.value || undefined,
    status: statusFilter.value || undefined,
    type: typeFilter.value || undefined,
    page: page.value
  })),
  headers: () => authHeaders(),
  watch: [searchQuery, statusFilter, typeFilter, page]
})
const items = computed(() => data.value?.items ?? [])

// Moving the last row of the last page out of the filter shrinks pageCount —
// step back instead of showing an empty page.
watch(data, (d) => {
  if (d && page.value > d.pageCount) page.value = d.pageCount
})

// Unsaved note edits, by feedback id.
const noteDrafts = ref<Record<string, string>>({})
const noteOf = (f: AdminFeedback) => noteDrafts.value[f.id] ?? f.adminNote ?? ''
const noteChanged = (f: AdminFeedback) => f.id in noteDrafts.value && noteDrafts.value[f.id]!.trim() !== (f.adminNote ?? '')

const busyId = ref<string | null>(null)
const actionError = ref('')

async function update(f: AdminFeedback, body: { status?: FeedbackStatus; adminNote?: string | null }) {
  busyId.value = f.id
  actionError.value = ''
  try {
    await $fetch(`/api/admin/feedback/${f.id}`, { method: 'PATCH', headers: authHeaders(), body })
    if ('adminNote' in body) {
      const { [f.id]: _saved, ...rest } = noteDrafts.value
      noteDrafts.value = rest
    }
    await refresh()
  } catch (e: any) {
    actionError.value = e?.data?.message || t('admin.saveError')
  } finally {
    busyId.value = null
  }
}

async function remove(f: AdminFeedback) {
  if (!confirm(t('adminFeedback.deleteConfirm'))) return
  busyId.value = f.id
  actionError.value = ''
  try {
    await $fetch(`/api/admin/feedback/${f.id}`, { method: 'DELETE', headers: authHeaders() })
    await refresh()
  } catch (e: any) {
    actionError.value = e?.data?.message || t('admin.saveError')
  } finally {
    busyId.value = null
  }
}

const statusClass: Record<FeedbackStatus, string> = {
  NEW: 'bg-sky-50 text-sky-700',
  IN_PROGRESS: 'bg-amber-50 text-amber-700',
  RESOLVED: 'bg-emerald-50 text-emerald-700',
  CLOSED: 'bg-ink-100 text-ink-500'
}
const formatDate = (d: string) => new Date(d).toLocaleString(locale.value, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

useSeoMeta({ title: () => `${t('adminFeedback.title')} — TopAICollection` })
</script>

<template>
  <div>
    <h1 class="flex items-center gap-2 text-xl font-extrabold text-ink-900">
      <span>💬</span> {{ t('adminFeedback.title') }}
      <span v-if="data?.newCount" class="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700">
        {{ t('adminFeedback.newBadge', { n: data.newCount }) }}
      </span>
    </h1>

    <div class="mt-5 flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-ink-500">{{ t('adminFeedback.total', { n: data?.total ?? 0 }) }}</p>
      <div class="flex w-full flex-wrap gap-2 sm:w-auto">
        <select v-model="statusFilter" class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400">
          <option value="">{{ t('adminFeedback.statusAll') }}</option>
          <option v-for="s in STATUSES" :key="s" :value="s">{{ t(`adminFeedback.statuses.${s}`) }}</option>
        </select>
        <select v-model="typeFilter" class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400">
          <option value="">{{ t('adminFeedback.typeAll') }}</option>
          <option v-for="ty in TYPES" :key="ty" :value="ty">{{ t(`adminFeedback.types.${ty}`) }}</option>
        </select>
        <div class="w-full sm:w-64">
          <SearchBar v-model="searchQuery" :placeholder="t('adminFeedback.searchPlaceholder')" dense />
        </div>
      </div>
    </div>

    <p v-if="actionError" class="mt-3 text-sm text-red-600">{{ actionError }}</p>

    <div class="mt-4 overflow-x-auto rounded-xl border border-ink-100">
      <table class="w-full min-w-[1000px] text-left text-sm">
        <thead class="bg-ink-100/40 text-xs uppercase tracking-wide text-ink-400">
          <tr>
            <th class="px-4 py-3">{{ t('adminFeedback.colUser') }}</th>
            <th class="px-4 py-3">{{ t('adminFeedback.colMessage') }}</th>
            <th class="px-4 py-3">{{ t('adminFeedback.colStatus') }}</th>
            <th class="px-4 py-3">{{ t('adminFeedback.colNote') }}</th>
            <th class="px-4 py-3 text-right">{{ t('adminFeedback.colActions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="f in items" :key="f.id" class="border-t border-ink-100 align-top">
            <td class="w-[200px] px-4 py-3">
              <span class="block font-semibold text-ink-900">{{ f.user.name || '—' }}</span>
              <span class="block break-all text-xs text-ink-500">{{ f.user.email }}</span>
              <span class="mt-1 block text-xs text-ink-400">{{ formatDate(f.createdAt) }}</span>
            </td>
            <td class="max-w-[420px] px-4 py-3">
              <span class="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-700">{{ t(`adminFeedback.types.${f.type}`) }}</span>
              <p class="mt-1.5 whitespace-pre-line break-words text-ink-900">{{ f.message }}</p>
              <div v-if="f.hasAttachment" class="mt-1.5">
                <FeedbackAttachment :feedback-id="f.id" :name="f.attachmentName" :type="f.attachmentType" />
              </div>
              <p v-if="f.locale || f.userAgent" class="mt-1.5 truncate text-[11px] text-ink-400" :title="f.userAgent ?? ''">
                {{ [f.locale, f.userAgent].filter(Boolean).join(' · ') }}
              </p>
            </td>
            <td class="w-[170px] px-4 py-3">
              <select
                :value="f.status"
                :disabled="busyId === f.id"
                :class="['w-full rounded-lg border-0 px-2.5 py-1.5 text-xs font-semibold outline-none', statusClass[f.status]]"
                @change="update(f, { status: ($event.target as HTMLSelectElement).value as FeedbackStatus })"
              >
                <option v-for="s in STATUSES" :key="s" :value="s">{{ t(`adminFeedback.statuses.${s}`) }}</option>
              </select>
              <span v-if="f.resolvedAt" class="mt-1 block text-[11px] text-ink-400">{{ formatDate(f.resolvedAt) }}</span>
            </td>
            <td class="w-[260px] px-4 py-3">
              <textarea
                :value="noteOf(f)"
                rows="2"
                maxlength="2000"
                :placeholder="t('adminFeedback.notePlaceholder')"
                class="w-full resize-y rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs outline-none focus:border-brand-400"
                @input="noteDrafts = { ...noteDrafts, [f.id]: ($event.target as HTMLTextAreaElement).value }"
              ></textarea>
              <button
                v-if="noteChanged(f)"
                type="button"
                :disabled="busyId === f.id"
                class="mt-1 text-xs font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-50"
                @click="update(f, { adminNote: noteDrafts[f.id]!.trim() || null })"
              >
                {{ t('adminFeedback.saveNote') }}
              </button>
            </td>
            <td class="whitespace-nowrap px-4 py-3 text-right">
              <button
                type="button"
                :disabled="busyId === f.id"
                class="text-sm font-semibold text-red-500 hover:text-red-600 disabled:opacity-50"
                @click="remove(f)"
              >
                {{ t('adminFeedback.delete') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!items.length" class="py-12 text-center text-sm text-ink-400">{{ t('adminFeedback.empty') }}</p>
    </div>

    <div v-if="(data?.pageCount ?? 1) > 1" class="mt-4 flex items-center justify-center gap-3 text-sm">
      <button type="button" :disabled="page <= 1" class="rounded-lg border border-ink-200 px-3 py-1.5 font-semibold text-ink-700 disabled:opacity-40" @click="page--">‹</button>
      <span class="text-ink-500">{{ page }} / {{ data?.pageCount }}</span>
      <button type="button" :disabled="page >= (data?.pageCount ?? 1)" class="rounded-lg border border-ink-200 px-3 py-1.5 font-semibold text-ink-700 disabled:opacity-40" @click="page++">›</button>
    </div>
  </div>
</template>
