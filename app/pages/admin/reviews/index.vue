<script setup lang="ts">
import type { AdminReview, AdminReviewsResponse, ReviewStatus } from '~/types'

const { t, locale } = useI18n()
definePageMeta({ layout: 'dashboard', middleware: ['auth', 'admin'] })
const { authHeaders } = useAuth()

const searchQuery = ref('')
// Pending first — that's the moderation queue.
const statusFilter = ref<'' | ReviewStatus>('PENDING')
const page = ref(1)

watch([searchQuery, statusFilter], () => { page.value = 1 })

const { data, refresh } = await useFetch<AdminReviewsResponse>('/api/admin/reviews', {
  query: computed(() => ({ q: searchQuery.value || undefined, status: statusFilter.value || undefined, page: page.value })),
  headers: authHeaders(),
  watch: [searchQuery, statusFilter, page]
})
const items = computed(() => data.value?.items ?? [])

// Approving/deleting the last row of the last page (e.g. in the Pending
// filter) shrinks pageCount — step back instead of showing an empty page.
watch(data, (d) => {
  if (d && page.value > d.pageCount) page.value = d.pageCount
})

const statusClass: Record<ReviewStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700',
  APPROVED: 'bg-emerald-50 text-emerald-700',
  REJECTED: 'bg-red-50 text-red-600'
}

const busyId = ref<string | null>(null)
const actionError = ref('')

async function setStatus(r: AdminReview, status: ReviewStatus) {
  busyId.value = r.id
  actionError.value = ''
  try {
    await $fetch(`/api/admin/reviews/${r.id}`, { method: 'PATCH', headers: authHeaders(), body: { status } })
    await refresh()
  } catch (e: any) {
    actionError.value = e?.data?.message || t('admin.saveError')
  } finally {
    busyId.value = null
  }
}

async function remove(r: AdminReview) {
  if (!confirm(t('admin.reviews.deleteConfirm'))) return
  busyId.value = r.id
  actionError.value = ''
  try {
    await $fetch(`/api/admin/reviews/${r.id}`, { method: 'DELETE', headers: authHeaders() })
    await refresh()
  } catch (e: any) {
    actionError.value = e?.data?.message || t('admin.saveError')
  } finally {
    busyId.value = null
  }
}

const authorName = (r: AdminReview) => r.user?.name || r.userInfo?.name || t('admin.reviews.guest')
const authorEmail = (r: AdminReview) => r.user?.email || r.userInfo?.email || ''
const formatDate = (d: string) => new Date(d).toLocaleDateString(locale.value, { year: 'numeric', month: 'short', day: 'numeric' })

useSeoMeta({ title: () => `${t('admin.reviews.title')} — TopAICollection` })
</script>

<template>
  <div>
    <h1 class="flex items-center gap-2 text-xl font-extrabold text-ink-900">
      <span>⭐</span> {{ t('admin.reviews.title') }}
      <span v-if="data?.pendingCount" class="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
        {{ t('admin.reviews.pendingBadge', { n: data.pendingCount }) }}
      </span>
    </h1>

    <div class="mt-5 flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-ink-500">{{ t('admin.reviews.total', { n: data?.total ?? 0 }) }}</p>
      <div class="flex w-full flex-wrap gap-2 sm:w-auto">
        <select v-model="statusFilter" class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400">
          <option value="">{{ t('admin.reviews.statusAll') }}</option>
          <option v-for="s in (['PENDING', 'APPROVED', 'REJECTED'] as const)" :key="s" :value="s">{{ t(`admin.reviews.statuses.${s}`) }}</option>
        </select>
        <div class="w-full sm:w-64">
          <SearchBar v-model="searchQuery" :placeholder="t('admin.reviews.searchPlaceholder')" dense />
        </div>
      </div>
    </div>

    <p v-if="actionError" class="mt-3 text-sm text-red-600">{{ actionError }}</p>

    <div class="mt-4 overflow-x-auto rounded-xl border border-ink-100">
      <table class="w-full min-w-[900px] text-left text-sm">
        <thead class="bg-ink-100/40 text-xs uppercase tracking-wide text-ink-400">
          <tr>
            <th class="px-4 py-3">{{ t('admin.reviews.colTool') }}</th>
            <th class="px-4 py-3">{{ t('admin.reviews.colAuthor') }}</th>
            <th class="px-4 py-3">{{ t('admin.reviews.colReview') }}</th>
            <th class="px-4 py-3">{{ t('admin.reviews.colStatus') }}</th>
            <th class="px-4 py-3">{{ t('admin.reviews.colCreated') }}</th>
            <th class="px-4 py-3 text-right">{{ t('admin.reviews.colActions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in items" :key="r.id" class="border-t border-ink-100 align-top">
            <td class="px-4 py-3">
              <NuxtLink :to="`/tools/${r.tool.slug}`" target="_blank" class="font-semibold text-ink-900 hover:text-brand-600">{{ r.tool.name }}</NuxtLink>
            </td>
            <td class="px-4 py-3">
              <span class="block font-semibold text-ink-900">{{ authorName(r) }}</span>
              <span class="block text-xs text-ink-500">{{ authorEmail(r) }}</span>
            </td>
            <td class="max-w-[420px] px-4 py-3">
              <div class="flex text-brand-500">
                <span v-for="i in 5" :key="i">{{ i <= r.rating ? '★' : '☆' }}</span>
              </div>
              <p class="mt-1 whitespace-pre-line break-words text-ink-700">{{ r.comment || '—' }}</p>
            </td>
            <td class="px-4 py-3">
              <span :class="['rounded-full px-2.5 py-0.5 text-xs font-semibold', statusClass[r.status]]">{{ t(`admin.reviews.statuses.${r.status}`) }}</span>
            </td>
            <td class="whitespace-nowrap px-4 py-3 text-ink-500">{{ formatDate(r.createdAt) }}</td>
            <td class="whitespace-nowrap px-4 py-3 text-right">
              <button
                v-if="r.status !== 'APPROVED'"
                type="button"
                :disabled="busyId === r.id"
                class="text-sm font-semibold text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                @click="setStatus(r, 'APPROVED')"
              >
                {{ t('admin.reviews.approve') }}
              </button>
              <button
                v-if="r.status !== 'REJECTED'"
                type="button"
                :disabled="busyId === r.id"
                class="ml-4 text-sm font-semibold text-amber-600 hover:text-amber-700 disabled:opacity-50"
                @click="setStatus(r, 'REJECTED')"
              >
                {{ t('admin.reviews.reject') }}
              </button>
              <button
                type="button"
                :disabled="busyId === r.id"
                class="ml-4 text-sm font-semibold text-red-500 hover:text-red-600 disabled:opacity-50"
                @click="remove(r)"
              >
                {{ t('admin.reviews.delete') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!items.length" class="py-12 text-center text-sm text-ink-400">{{ t('admin.reviews.empty') }}</p>
    </div>

    <div v-if="(data?.pageCount ?? 1) > 1" class="mt-4 flex items-center justify-center gap-3 text-sm">
      <button type="button" :disabled="page <= 1" class="rounded-lg border border-ink-200 px-3 py-1.5 font-semibold text-ink-700 disabled:opacity-40" @click="page--">‹</button>
      <span class="text-ink-500">{{ page }} / {{ data?.pageCount }}</span>
      <button type="button" :disabled="page >= (data?.pageCount ?? 1)" class="rounded-lg border border-ink-200 px-3 py-1.5 font-semibold text-ink-700 disabled:opacity-40" @click="page++">›</button>
    </div>
  </div>
</template>
