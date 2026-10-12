<script setup lang="ts">
type ContactStatus = 'NEW' | 'REPLIED' | 'CLOSED'
type ContactSubject = 'GENERAL' | 'SUPPORT' | 'FEEDBACK' | 'PARTNERSHIP' | 'OTHER'
interface AdminContactMessage {
  id: string
  name: string
  email: string
  subject: ContactSubject
  message: string
  status: ContactStatus
  reply: string | null
  repliedAt: string | null
  locale: string | null
  createdAt: string
  userId: string | null
}
interface AdminContactResponse { items: AdminContactMessage[]; total: number; newCount: number; page: number; pageCount: number }

const { t, locale } = useI18n()
definePageMeta({ layout: 'dashboard', middleware: ['auth', 'admin'] })
const { authHeaders } = useAuth()

const STATUSES: ContactStatus[] = ['NEW', 'REPLIED', 'CLOSED']

const searchQuery = ref('')
// New first — that's the inbox.
const statusFilter = ref<'' | ContactStatus>('NEW')
const page = ref(1)

watch([searchQuery, statusFilter], () => { page.value = 1 })

const { data, refresh } = await useFetch<AdminContactResponse>('/api/admin/contact-messages', {
  query: computed(() => ({ q: searchQuery.value || undefined, status: statusFilter.value || undefined, page: page.value })),
  headers: () => authHeaders(),
  watch: [searchQuery, statusFilter, page]
})
const items = computed(() => data.value?.items ?? [])

// Replying moves the last row of a filtered last page out of the filter — step back
// instead of showing an empty page.
watch(data, (d) => {
  if (d && page.value > d.pageCount) page.value = d.pageCount
})

// Unsent reply drafts, by message id.
const drafts = ref<Record<string, string>>({})
const draftOf = (m: AdminContactMessage) => drafts.value[m.id] ?? m.reply ?? ''
const draftChanged = (m: AdminContactMessage) => m.id in drafts.value && drafts.value[m.id]!.trim() !== '' && drafts.value[m.id]!.trim() !== (m.reply ?? '')

const busyId = ref<string | null>(null)
const actionError = ref('')
const notice = ref('')

async function act(m: AdminContactMessage, fn: () => Promise<unknown>) {
  busyId.value = m.id
  actionError.value = ''
  notice.value = ''
  try {
    await fn()
    await refresh()
  } catch (e: any) {
    actionError.value = e?.data?.message || t('admin.saveError')
  } finally {
    busyId.value = null
  }
}

const sendReply = (m: AdminContactMessage) => act(m, async () => {
  const res = await $fetch<{ emailed: boolean }>(`/api/admin/contact-messages/${m.id}/reply`, {
    method: 'POST',
    headers: authHeaders(),
    body: { reply: drafts.value[m.id]!.trim() }
  })
  const { [m.id]: _sent, ...rest } = drafts.value
  drafts.value = rest
  if (!res.emailed) notice.value = t('adminContact.replyEmailFailed')
})

const setStatus = (m: AdminContactMessage, status: ContactStatus) => act(m, () =>
  $fetch(`/api/admin/contact-messages/${m.id}`, { method: 'PATCH', headers: authHeaders(), body: { status } }))

function remove(m: AdminContactMessage) {
  if (!confirm(t('adminContact.deleteConfirm'))) return
  act(m, () => $fetch(`/api/admin/contact-messages/${m.id}`, { method: 'DELETE', headers: authHeaders() }))
}

const statusClass: Record<ContactStatus, string> = {
  NEW: 'bg-sky-50 text-sky-700',
  REPLIED: 'bg-emerald-50 text-emerald-700',
  CLOSED: 'bg-ink-100 text-ink-500'
}
const formatDate = (d: string) => new Date(d).toLocaleString(locale.value, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

useSeoMeta({ title: () => `${t('adminContact.title')} — TopAICollection` })
</script>

<template>
  <div>
    <h1 class="flex items-center gap-2 text-xl font-extrabold text-ink-900">
      <span>✉️</span> {{ t('adminContact.title') }}
      <span v-if="data?.newCount" class="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700">
        {{ t('adminContact.newBadge', { n: data.newCount }) }}
      </span>
    </h1>

    <div class="mt-5 flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-ink-500">{{ t('adminContact.total', { n: data?.total ?? 0 }) }}</p>
      <div class="flex w-full flex-wrap gap-2 sm:w-auto">
        <select v-model="statusFilter" class="rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400">
          <option value="">{{ t('adminContact.statusAll') }}</option>
          <option v-for="s in STATUSES" :key="s" :value="s">{{ t(`myInquiries.statuses.${s}`) }}</option>
        </select>
        <div class="w-full sm:w-64">
          <SearchBar v-model="searchQuery" :placeholder="t('adminContact.searchPlaceholder')" dense />
        </div>
      </div>
    </div>

    <p v-if="actionError" class="mt-3 text-sm text-red-600" role="alert">{{ actionError }}</p>
    <p v-if="notice" class="mt-3 text-sm text-amber-700" role="status">{{ notice }}</p>

    <div class="mt-4 overflow-x-auto rounded-xl border border-ink-100">
      <table class="w-full min-w-[1000px] text-left text-sm">
        <thead class="bg-ink-100/40 text-xs uppercase tracking-wide text-ink-400">
          <tr>
            <th class="px-4 py-3">{{ t('adminContact.colSender') }}</th>
            <th class="px-4 py-3">{{ t('adminContact.colMessage') }}</th>
            <th class="px-4 py-3">{{ t('adminContact.colStatus') }}</th>
            <th class="px-4 py-3">{{ t('adminContact.colReply') }}</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in items" :key="m.id" class="border-t border-ink-100 align-top">
            <td class="w-[210px] px-4 py-3">
              <span class="block font-semibold text-ink-900">{{ m.name }}</span>
              <a :href="`mailto:${m.email}`" class="block break-all text-xs text-brand-600 hover:text-brand-700">{{ m.email }}</a>
              <span v-if="!m.userId" class="mt-1 inline-block rounded bg-ink-100 px-1.5 py-0.5 text-[11px] font-semibold text-ink-500">{{ t('adminContact.guest') }}</span>
              <span class="mt-1 block text-xs text-ink-400">{{ formatDate(m.createdAt) }}<template v-if="m.locale"> · {{ m.locale }}</template></span>
            </td>
            <td class="max-w-[420px] px-4 py-3">
              <span class="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-700">{{ t(`contactPage.form.fields.subject.options.${m.subject.toLowerCase()}`) }}</span>
              <p class="mt-1.5 whitespace-pre-line break-words text-ink-900">{{ m.message }}</p>
            </td>
            <td class="w-[150px] px-4 py-3">
              <select
                :value="m.status"
                :disabled="busyId === m.id"
                :class="['w-full rounded-lg border-0 px-2.5 py-1.5 text-xs font-semibold outline-none', statusClass[m.status]]"
                @change="setStatus(m, ($event.target as HTMLSelectElement).value as ContactStatus)"
              >
                <option v-for="s in STATUSES" :key="s" :value="s">{{ t(`myInquiries.statuses.${s}`) }}</option>
              </select>
              <span v-if="m.repliedAt" class="mt-1 block text-[11px] text-ink-400">{{ t('adminContact.repliedAt', { date: formatDate(m.repliedAt) }) }}</span>
            </td>
            <td class="w-[300px] px-4 py-3">
              <textarea
                :value="draftOf(m)"
                rows="3"
                maxlength="5000"
                :placeholder="t('adminContact.replyPlaceholder')"
                class="w-full resize-y rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs outline-none focus:border-brand-400"
                @input="drafts = { ...drafts, [m.id]: ($event.target as HTMLTextAreaElement).value }"
              ></textarea>
              <button
                v-if="draftChanged(m)"
                type="button"
                :disabled="busyId === m.id"
                class="mt-1 rounded-lg bg-brand-500 px-3 py-1 text-xs font-bold text-white hover:bg-brand-600 disabled:opacity-50"
                @click="sendReply(m)"
              >
                {{ t('adminContact.sendReply') }}
              </button>
            </td>
            <td class="whitespace-nowrap px-4 py-3 text-right">
              <button type="button" :disabled="busyId === m.id" class="text-sm font-semibold text-red-500 hover:text-red-600 disabled:opacity-50" @click="remove(m)">
                {{ t('adminContact.delete') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!items.length" class="py-12 text-center text-sm text-ink-400">{{ t('adminContact.empty') }}</p>
    </div>

    <div v-if="(data?.pageCount ?? 1) > 1" class="mt-4 flex items-center justify-center gap-3 text-sm">
      <button type="button" :disabled="page <= 1" class="rounded-lg border border-ink-200 px-3 py-1.5 font-semibold text-ink-700 disabled:opacity-40" @click="page--">‹</button>
      <span class="text-ink-500">{{ page }} / {{ data?.pageCount }}</span>
      <button type="button" :disabled="page >= (data?.pageCount ?? 1)" class="rounded-lg border border-ink-200 px-3 py-1.5 font-semibold text-ink-700 disabled:opacity-40" @click="page++">›</button>
    </div>
  </div>
</template>
