<script setup lang="ts">
// Admin → Newsletter: who signed up on the home page ("Get the best AI tools, weekly").
// Search, add an address by hand, remove one (an unsubscribe request), export to CSV.
// The weekly email (server/utils/newsletter.ts): preview, test, send now, the issues sent.
interface Subscriber { id: string; email: string; locale: string; userId: string | null; createdAt: string }
interface Res { items: Subscriber[]; total: number; page: number; pageCount: number; stats: { all: number; lastWeek: number } }
interface Issue { id: string; status: 'SENDING' | 'DONE' | 'CANCELED'; source: string; tools: number; articles: number; recipients: number; sent: number; failed: number; createdAt: string; finishedAt: string | null }
interface IssuesRes { smtpReady: boolean; dailyLimit: number; sentLastDay: number; limits: { tools: number; articles: number; perHour: number }; issues: Issue[] }

const { t, locale } = useI18n()
definePageMeta({ layout: 'dashboard', middleware: ['auth', 'admin'] })
const { authHeaders } = useAuth()

const search = ref('')
const q = ref('')
let timer: ReturnType<typeof setTimeout> | undefined
watch(search, (v) => { clearTimeout(timer); timer = setTimeout(() => { q.value = v.trim() }, 350) })
const page = ref(1)
watch(q, () => { page.value = 1 })

const { data, pending, refresh } = await useFetch<Res>('/api/admin/newsletter', {
  query: computed(() => ({ q: q.value || undefined, page: page.value })),
  headers: () => authHeaders()
})
const items = computed(() => data.value?.items ?? [])
const nf = computed(() => new Intl.NumberFormat(locale.value))
const date = (iso: string) => new Date(iso).toLocaleString(locale.value, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

const notice = ref('')
const error = ref('')
function flash(ok: string, err = '') { notice.value = ok; error.value = err }

// Add by hand
const newEmail = ref('')
const adding = ref(false)
async function add() {
  if (adding.value || !newEmail.value.trim()) return
  adding.value = true
  try {
    await $fetch('/api/admin/newsletter', { method: 'POST', headers: authHeaders(), body: { email: newEmail.value, locale: locale.value } })
    flash(t('adminNewsletter.added', { email: newEmail.value.trim().toLowerCase() }))
    newEmail.value = ''
    await refresh()
  } catch (e: any) {
    flash('', e?.statusCode === 409 ? t('adminNewsletter.exists') : t('adminNewsletter.invalid'))
  } finally {
    adding.value = false
  }
}

// Remove
const removingId = ref<string | null>(null)
async function remove(s: Subscriber) {
  if (!confirm(t('adminNewsletter.confirmRemove', { email: s.email }))) return
  removingId.value = s.id
  try {
    await $fetch(`/api/admin/newsletter/${s.id}`, { method: 'DELETE', headers: authHeaders() })
    flash(t('adminNewsletter.removed', { email: s.email }))
    await refresh()
    if (!items.value.length && page.value > 1) page.value--
  } catch {
    flash('', t('admin.saveError'))
  } finally {
    removingId.value = null
  }
}

// Export
const exporting = ref(false)
async function exportCsv() {
  exporting.value = true
  try {
    const csv = await $fetch<string>('/api/admin/newsletter', { query: { format: 'csv', q: q.value || undefined }, headers: authHeaders(), responseType: 'text' })
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `newsletter-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  } finally {
    exporting.value = false
  }
}

// Weekly email
const { data: sending, refresh: refreshSending } = await useFetch<IssuesRes>('/api/admin/newsletter/issues', { headers: () => authHeaders() })
const sendingIssue = computed(() => sending.value?.issues.find(i => i.status === 'SENDING'))
// While an issue goes out, its counts move: look again every 30 s.
let poll: ReturnType<typeof setInterval> | undefined
onMounted(() => { poll = setInterval(() => { if (sendingIssue.value) refreshSending() }, 30_000) })
onBeforeUnmount(() => clearInterval(poll))

const MAIL_LOCALES = ['en', 'vi', 'zh', 'es', 'de', 'ja', 'fr', 'ko', 'pt', 'id']
const mailLocale = ref(MAIL_LOCALES.includes(locale.value) ? locale.value : 'en')
const sendNotice = ref('')
const sendError = ref('')
function sendFlash(ok: string, err = '') { sendNotice.value = ok; sendError.value = err }

const preview = ref<{ subject: string; html: string } | null>(null)
const previewing = ref(false)
async function openPreview() {
  previewing.value = true
  try {
    preview.value = await $fetch<{ subject: string; html: string }>('/api/admin/newsletter/preview', { query: { locale: mailLocale.value }, headers: authHeaders() })
  } catch {
    sendFlash('', t('admin.saveError'))
  } finally {
    previewing.value = false
  }
}

const testing = ref(false)
async function sendTest() {
  testing.value = true
  try {
    const res = await $fetch<{ to: string }>('/api/admin/newsletter/test', { method: 'POST', headers: authHeaders(), body: { locale: mailLocale.value } })
    sendFlash(t('adminNewsletter.testSent', { email: res.to }))
  } catch (e: any) {
    sendFlash('', e?.data?.message || t('admin.saveError'))
  } finally {
    testing.value = false
  }
}

const starting = ref(false)
async function sendNow() {
  const n = data.value?.stats.all ?? 0
  if (!confirm(t('adminNewsletter.confirmSend', { n: nf.value.format(n), limit: nf.value.format(sending.value?.dailyLimit ?? 0) }))) return
  starting.value = true
  try {
    await $fetch('/api/admin/newsletter/send', { method: 'POST', headers: authHeaders() })
    sendFlash(t('adminNewsletter.sendStarted'))
    await refreshSending()
  } catch (e: any) {
    const reason = e?.data?.data?.reason
    sendFlash('', reason === 'running' ? t('adminNewsletter.running') : reason === 'empty' ? t('adminNewsletter.emptyWeek') : reason === 'no-subscribers' ? t('adminNewsletter.noSubscribers') : (e?.data?.message || t('admin.saveError')))
  } finally {
    starting.value = false
  }
}

async function cancelIssue(issue: Issue) {
  if (!confirm(t('adminNewsletter.confirmCancel'))) return
  try {
    await $fetch(`/api/admin/newsletter/issues/${issue.id}/cancel`, { method: 'POST', headers: authHeaders() })
    await refreshSending()
  } catch {
    sendFlash('', t('admin.saveError'))
  }
}
const statusClass: Record<Issue['status'], string> = {
  SENDING: 'bg-amber-50 text-amber-700',
  DONE: 'bg-emerald-50 text-emerald-700',
  CANCELED: 'bg-ink-100 text-ink-600'
}

useSeoMeta({ title: () => `${t('adminNewsletter.title')} — TopAICollection` })
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-xl font-extrabold text-ink-900">{{ t('adminNewsletter.title') }}</h1>
      <button type="button" :disabled="exporting || !data?.total" class="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-50" @click="exportCsv">
        {{ t('adminNewsletter.export') }}
      </button>
    </div>
    <p class="mt-1 text-sm text-ink-600">{{ t('adminNewsletter.note', { limit: nf.format(sending?.dailyLimit ?? 300) }) }}</p>

    <!-- Weekly email -->
    <section class="mt-5 rounded-xl border border-ink-100 p-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-base font-bold text-ink-900">{{ t('adminNewsletter.sendingTitle') }}</h2>
        <span v-if="sending" class="text-xs text-ink-500">{{ t('adminNewsletter.quota', { sent: nf.format(sending.sentLastDay), limit: nf.format(sending.dailyLimit) }) }}</span>
      </div>
      <p v-if="sending && !sending.smtpReady" class="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{{ t('adminNewsletter.smtpMissing') }}</p>
      <p v-if="sending" class="mt-2 text-xs text-ink-500">{{ t('adminNewsletter.policy', { tools: sending.limits.tools, articles: sending.limits.articles }) }}</p>

      <div class="mt-3 flex flex-wrap items-center gap-2">
        <select v-model="mailLocale" :aria-label="t('adminNewsletter.language')" class="rounded-lg border border-ink-200 px-2 py-2 text-sm uppercase outline-none focus:border-ink-400">
          <option v-for="code in MAIL_LOCALES" :key="code" :value="code">{{ code }}</option>
        </select>
        <button type="button" :disabled="previewing" class="rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-900 hover:border-ink-400 disabled:opacity-50" @click="openPreview">{{ t('adminNewsletter.preview') }}</button>
        <button type="button" :disabled="testing || !sending?.smtpReady" class="rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-900 hover:border-ink-400 disabled:opacity-50" @click="sendTest">{{ t('adminNewsletter.sendTest') }}</button>
        <button type="button" :disabled="starting || !!sendingIssue || !sending?.smtpReady || !data?.stats.all" class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50 sm:ml-auto" @click="sendNow">{{ t('adminNewsletter.sendNow') }}</button>
      </div>
      <p v-if="sendNotice" class="mt-2 text-sm text-emerald-700">{{ sendNotice }}</p>
      <p v-if="sendError" class="mt-2 text-sm text-red-600">{{ sendError }}</p>

      <h3 class="mt-5 text-sm font-semibold text-ink-900">{{ t('adminNewsletter.history') }}</h3>
      <div class="mt-2 overflow-x-auto">
        <table v-if="sending?.issues.length" class="w-full min-w-[560px] text-left text-sm">
          <thead class="text-xs uppercase tracking-wide text-ink-400">
            <tr>
              <th class="py-2 pr-3">{{ t('adminNewsletter.colDate') }}</th>
              <th class="py-2 pr-3">{{ t('adminNewsletter.colContent') }}</th>
              <th class="py-2 pr-3">{{ t('adminNewsletter.colSent') }}</th>
              <th class="py-2 pr-3">{{ t('adminNewsletter.colStatus') }}</th>
              <th class="py-2" />
            </tr>
          </thead>
          <tbody class="divide-y divide-ink-100">
            <tr v-for="issue in sending.issues" :key="issue.id">
              <td class="whitespace-nowrap py-2 pr-3 text-ink-700">
                {{ date(issue.createdAt) }}
                <span class="ml-1 text-xs text-ink-400">{{ issue.source === 'admin' ? t('adminNewsletter.sourceAdmin') : t('adminNewsletter.sourceSchedule') }}</span>
              </td>
              <td class="py-2 pr-3 text-ink-700">{{ t('adminNewsletter.contentLine', { tools: issue.tools, articles: issue.articles }) }}</td>
              <td class="whitespace-nowrap py-2 pr-3 text-ink-700">
                {{ nf.format(issue.sent) }} / {{ nf.format(issue.recipients) }}
                <span v-if="issue.failed" class="ml-1 text-xs text-red-600">{{ t('adminNewsletter.failed', { n: nf.format(issue.failed) }) }}</span>
              </td>
              <td class="py-2 pr-3"><span :class="['rounded-full px-2 py-0.5 text-xs font-semibold', statusClass[issue.status]]">{{ t(`adminNewsletter.status${issue.status}`) }}</span></td>
              <td class="py-2 text-right">
                <button v-if="issue.status === 'SENDING'" type="button" class="text-sm font-semibold text-red-600 hover:text-red-700" @click="cancelIssue(issue)">{{ t('adminNewsletter.cancel') }}</button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="py-4 text-sm text-ink-400">{{ t('adminNewsletter.noIssues') }}</p>
      </div>
    </section>

    <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:max-w-[560px]">
      <div class="rounded-xl border border-ink-100 p-4">
        <div class="text-xs text-ink-500">{{ t('adminNewsletter.total') }}</div>
        <div class="mt-1 text-2xl font-extrabold text-ink-900">{{ nf.format(data?.stats.all ?? 0) }}</div>
      </div>
      <div class="rounded-xl border border-ink-100 p-4">
        <div class="text-xs text-ink-500">{{ t('adminNewsletter.lastWeek') }}</div>
        <div class="mt-1 text-2xl font-extrabold text-ink-900">+{{ nf.format(data?.stats.lastWeek ?? 0) }}</div>
      </div>
    </div>

    <div class="mt-5 flex flex-wrap items-center gap-3">
      <input v-model="search" type="search" :placeholder="t('adminOrders.searchEmail')" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ink-400 sm:w-72">
      <form class="flex w-full gap-2 sm:ml-auto sm:w-auto" @submit.prevent="add">
        <input v-model="newEmail" type="email" required maxlength="254" :placeholder="t('adminNewsletter.addPlaceholder')" class="min-w-0 flex-1 rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ink-400 sm:w-64">
        <button type="submit" :disabled="adding" class="shrink-0 rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-900 hover:border-ink-400 disabled:opacity-50">{{ t('adminNewsletter.add') }}</button>
      </form>
    </div>
    <p v-if="notice" class="mt-2 text-sm text-emerald-700">{{ notice }}</p>
    <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>

    <div :class="['mt-4 overflow-x-auto rounded-xl border border-ink-100', pending && 'opacity-60']">
      <table class="w-full min-w-[620px] text-left text-sm">
        <thead class="bg-ink-100/40 text-xs uppercase tracking-wide text-ink-400">
          <tr>
            <th class="px-4 py-3">{{ t('adminNewsletter.email') }}</th>
            <th class="px-4 py-3">{{ t('adminNewsletter.language') }}</th>
            <th class="px-4 py-3">{{ t('adminNewsletter.date') }}</th>
            <th class="px-4 py-3" />
          </tr>
        </thead>
        <tbody class="divide-y divide-ink-100">
          <tr v-for="s in items" :key="s.id">
            <td class="px-4 py-3 text-ink-900">{{ s.email }} <span v-if="s.userId" class="ml-1 rounded-full bg-ink-100 px-2 py-0.5 text-[11px] text-ink-700">{{ t('adminNewsletter.member') }}</span></td>
            <td class="px-4 py-3 uppercase text-ink-600">{{ s.locale }}</td>
            <td class="whitespace-nowrap px-4 py-3 text-ink-600">{{ date(s.createdAt) }}</td>
            <td class="px-4 py-3 text-right">
              <button type="button" :disabled="removingId === s.id" class="text-sm font-semibold text-red-600 hover:text-red-700 disabled:opacity-50" @click="remove(s)">{{ t('adminNewsletter.remove') }}</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!pending && !items.length" class="py-12 text-center text-sm text-ink-400">{{ t('adminNewsletter.empty') }}</p>
    </div>
    <p v-if="data && q" class="mt-2 text-xs text-ink-500">{{ t('adminNewsletter.count', { n: nf.format(data.total) }, data.total) }}</p>

    <nav v-if="(data?.pageCount ?? 1) > 1" class="mt-6 flex flex-wrap justify-center gap-1.5">
      <button
        v-for="p in data!.pageCount"
        :key="p"
        type="button"
        :class="['min-w-9 rounded-lg border px-3 py-1.5 text-sm font-semibold', p === page ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-200 text-ink-700 hover:border-ink-400']"
        @click="page = p"
      >{{ p }}</button>
    </nav>

    <!-- Preview: the email's own HTML, in a sandboxed frame (no scripts, no same-origin). -->
    <div v-if="preview" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="preview = null">
      <div class="flex h-[85vh] w-full max-w-[680px] flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div class="flex items-center gap-3 border-b border-ink-100 px-4 py-3">
          <span class="min-w-0 flex-1 truncate text-sm font-semibold text-ink-900">{{ preview.subject }}</span>
          <button type="button" class="rounded-lg border border-ink-200 px-3 py-1.5 text-sm font-semibold text-ink-900 hover:border-ink-400" @click="preview = null">{{ t('adminNewsletter.close') }}</button>
        </div>
        <iframe :srcdoc="preview.html" sandbox="" title="Preview" class="w-full flex-1 border-0" />
      </div>
    </div>
  </div>
</template>
