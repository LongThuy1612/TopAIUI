<script setup lang="ts">
type ContactStatus = 'NEW' | 'REPLIED' | 'CLOSED'
type ContactSubject = 'GENERAL' | 'SUPPORT' | 'FEEDBACK' | 'PARTNERSHIP' | 'OTHER'
interface Inquiry {
  id: string
  subject: ContactSubject
  message: string
  status: ContactStatus
  reply: string | null
  repliedAt: string | null
  createdAt: string
}

const { t, locale } = useI18n()
definePageMeta({ layout: 'dashboard', middleware: 'auth' })
const { authHeaders } = useAuth()

const { data, pending, error } = await useFetch<{ items: Inquiry[] }>('/api/me/contact-messages', { headers: () => authHeaders() })
const items = computed(() => data.value?.items ?? [])

const statusClass: Record<ContactStatus, string> = {
  NEW: 'bg-sky-50 text-sky-700',
  REPLIED: 'bg-emerald-50 text-emerald-700',
  CLOSED: 'bg-ink-100 text-ink-500'
}
const formatDate = (iso: string) => new Date(iso).toLocaleDateString(locale.value, { year: 'numeric', month: 'short', day: 'numeric' })

useSeoMeta({ title: () => `${t('myInquiries.title')} — TopAICollection` })
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-extrabold text-ink-900">{{ t('myInquiries.title') }}</h1>
        <p class="mt-1 text-sm text-ink-500">{{ t('myInquiries.subtitle') }}</p>
      </div>
      <NuxtLinkLocale to="/contact" class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-600">{{ t('myInquiries.newMessage') }}</NuxtLinkLocale>
    </div>

    <p v-if="error" class="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{{ t('auth.registerError') }}</p>

    <div class="mt-5 max-w-5xl overflow-hidden rounded-xl border border-ink-100">
      <ul v-if="items.length" class="divide-y divide-ink-100">
        <li v-for="m in items" :key="m.id" class="px-4 py-4">
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span :class="['rounded-full px-2.5 py-0.5 font-semibold', statusClass[m.status]]">{{ t(`myInquiries.statuses.${m.status}`) }}</span>
            <span class="font-semibold text-ink-700">{{ t(`contactPage.form.fields.subject.options.${m.subject.toLowerCase()}`) }}</span>
            <span class="text-ink-400">{{ formatDate(m.createdAt) }}</span>
          </div>
          <p class="mt-1.5 whitespace-pre-line break-words text-sm text-ink-900">{{ m.message }}</p>
          <div v-if="m.reply" class="mt-3 rounded-lg border-l-4 border-emerald-300 bg-emerald-50/60 px-3 py-2">
            <div class="text-xs font-bold text-emerald-800">
              {{ t('myInquiries.reply') }}<template v-if="m.repliedAt"> · {{ formatDate(m.repliedAt) }}</template>
            </div>
            <p class="mt-1 whitespace-pre-line break-words text-sm text-ink-900">{{ m.reply }}</p>
          </div>
        </li>
      </ul>
      <p v-else-if="pending" class="py-10 text-center text-sm text-ink-400">…</p>
      <p v-else class="py-10 text-center text-sm text-ink-400">{{ t('myInquiries.empty') }}</p>
    </div>
  </div>
</template>
