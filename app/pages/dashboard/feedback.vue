<script setup lang="ts">
import type { FeedbackStatus, FeedbackType, MyFeedback } from '~/types'

const { t, locale } = useI18n()
const { authHeaders } = useAuth()
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const feedbackTypes: { key: FeedbackType; labelKey: string }[] = [
  { key: 'FEATURE', labelKey: 'typeFeature' },
  { key: 'ISSUE', labelKey: 'typeIssue' },
  { key: 'BILLING', labelKey: 'typeBilling' },
  { key: 'OTHER', labelKey: 'typeOther' }
]

// Same limits as server/utils/feedback.ts; the server checks them again.
const MIN_LENGTH = 10
const MAX_LENGTH = 1000
const MAX_BYTES = 20 * 1024 * 1024
const ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime'
const ACCEPTED_TYPES = new Set(ACCEPT.split(','))
const ACCEPTED_EXTENSIONS = /\.(png|jpe?g|webp|gif|mp4|webm|mov)$/i

// Some browsers / OSes report an empty type for videos (.mov, .webm on
// Windows), so fall back to the extension. The server checks the bytes anyway.
function isAccepted(f: File) {
  return f.type ? ACCEPTED_TYPES.has(f.type) : ACCEPTED_EXTENSIONS.test(f.name)
}

const selectedType = ref<FeedbackType>('FEATURE')
const description = ref('')
const file = ref<File | null>(null)
const fileInput = ref<HTMLInputElement>()

const sending = ref(false)
const errorMessage = ref('')
const sent = ref(false)

const { data: history, refresh: refreshHistory } = await useFetch<{ items: MyFeedback[] }>('/api/feedback', {
  headers: authHeaders()
})
const myFeedback = computed(() => history.value?.items ?? [])

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const picked = input.files?.[0] ?? null
  errorMessage.value = ''
  if (picked && !isAccepted(picked)) {
    errorMessage.value = t('feedbackPage.errorFileType')
    input.value = ''
    return
  }
  if (picked && picked.size > MAX_BYTES) {
    errorMessage.value = t('feedbackPage.errorFileSize')
    input.value = ''
    return
  }
  file.value = picked
}

function removeFile() {
  file.value = null
  if (fileInput.value) fileInput.value.value = ''
}

// The server's messages are English; its data.code picks the translated text.
function errorText(code: string | undefined) {
  switch (code) {
    case 'RATE_LIMIT': return t('feedbackPage.errorRateLimit')
    case 'FILE_TOO_LARGE': return t('feedbackPage.errorFileSize')
    case 'FILE_TYPE': return t('feedbackPage.errorFileType')
    case 'TOO_SHORT': return t('feedbackPage.errorTooShort', { n: MIN_LENGTH })
    default: return t('feedbackPage.errorGeneric')
  }
}

async function submitFeedback() {
  if (sending.value) return
  errorMessage.value = ''
  sent.value = false
  if (description.value.trim().length < MIN_LENGTH) {
    errorMessage.value = t('feedbackPage.errorTooShort', { n: MIN_LENGTH })
    return
  }

  const body = new FormData()
  body.append('type', selectedType.value)
  body.append('message', description.value.trim())
  body.append('locale', locale.value)
  if (file.value) body.append('file', file.value)

  sending.value = true
  try {
    await $fetch('/api/feedback', { method: 'POST', headers: authHeaders(), body })
    sent.value = true
    description.value = ''
    selectedType.value = 'FEATURE'
    removeFile()
    await refreshHistory()
  } catch (e: unknown) {
    // ofetch puts the server's error body on .data; createError's data is nested there.
    const err = e as { data?: { data?: { code?: string } } }
    errorMessage.value = errorText(err.data?.data?.code)
  } finally {
    sending.value = false
  }
}

const statusClass: Record<FeedbackStatus, string> = {
  NEW: 'bg-sky-50 text-sky-700',
  IN_PROGRESS: 'bg-amber-50 text-amber-700',
  RESOLVED: 'bg-emerald-50 text-emerald-700',
  CLOSED: 'bg-ink-100 text-ink-500'
}
const typeLabelKey: Record<FeedbackType, string> = { FEATURE: 'typeFeature', ISSUE: 'typeIssue', BILLING: 'typeBilling', OTHER: 'typeOther' }
const formatDate = (iso: string) => new Date(iso).toLocaleDateString(locale.value, { year: 'numeric', month: 'short', day: 'numeric' })
const formatSize = (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`

useSeoMeta({
  title: () => `${t('feedbackPage.title')} — TopAICollection`
})
</script>

<template>
  <div>
    <h1 class="text-xl font-extrabold text-ink-900">{{ t('feedbackPage.title') }}</h1>
    <p class="mt-1 text-sm text-ink-900">{{ t('feedbackPage.subtitle') }}</p>

    <form class="mt-6 max-w-5xl" @submit.prevent="submitFeedback">
      <div>
        <div class="text-sm font-semibold text-ink-900">{{ t('feedbackPage.feedbackType') }}</div>
        <div class="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <label
            v-for="type in feedbackTypes"
            :key="type.key"
            :class="[
              'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm',
              selectedType === type.key ? 'border-brand-400 ring-1 ring-brand-300' : 'border-ink-200'
            ]"
          >
            <input v-model="selectedType" type="radio" :value="type.key" class="h-4 w-4 shrink-0 accent-brand-500">
            <span class="text-ink-900">{{ t(`feedbackPage.${type.labelKey}`) }}</span>
          </label>
        </div>
      </div>

      <div class="mt-6">
        <label for="feedback-description" class="text-sm font-semibold text-ink-900">{{ t('feedbackPage.detailedDescription') }}</label>
        <div class="relative mt-2">
          <textarea
            id="feedback-description"
            v-model="description"
            :maxlength="MAX_LENGTH"
            rows="6"
            :placeholder="t('feedbackPage.descriptionPlaceholder')"
            class="w-full resize-y rounded-lg border border-ink-200 px-3 py-2.5 pb-7 text-sm outline-none focus:border-brand-400"
          ></textarea>
          <span class="pointer-events-none absolute bottom-3 right-3 text-xs text-ink-400">{{ description.length }}/{{ MAX_LENGTH }}</span>
        </div>
      </div>

      <div class="mt-6">
        <div class="text-sm font-semibold text-ink-900">{{ t('feedbackPage.attachment') }}</div>
        <div class="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-600 hover:bg-brand-100"
            @click="fileInput?.click()"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 16V4m0 0L7 9m5-5 5 5M5 20h14" /></svg>
            {{ t('feedbackPage.upload') }}
          </button>
          <input ref="fileInput" type="file" class="hidden" :accept="ACCEPT" @change="onFileChange">
          <span v-if="file" class="flex min-w-0 items-center gap-2 text-sm text-ink-900">
            <span class="truncate">{{ file.name }}</span>
            <span class="shrink-0 text-ink-500">({{ formatSize(file.size) }})</span>
            <button type="button" class="shrink-0 font-semibold text-red-500 hover:text-red-600" @click="removeFile">{{ t('feedbackPage.removeFile') }}</button>
          </span>
        </div>
        <p class="mt-2 text-xs text-ink-900">{{ t('feedbackPage.uploadHint') }}</p>
      </div>

      <div class="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          class="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="sending"
        >
          {{ sending ? t('feedbackPage.sending') : t('feedbackPage.submit') }}
        </button>
        <p v-if="sent" class="text-sm font-semibold text-emerald-600" role="status">{{ t('feedbackPage.success') }}</p>
        <p v-if="errorMessage" class="text-sm font-semibold text-red-600" role="alert">{{ errorMessage }}</p>
      </div>
    </form>

    <h2 class="mt-10 text-lg font-extrabold text-ink-900">{{ t('feedbackPage.historyTitle') }}</h2>
    <div class="mt-4 max-w-5xl overflow-hidden rounded-xl border border-ink-100">
      <ul v-if="myFeedback.length" class="divide-y divide-ink-100">
        <li v-for="f in myFeedback" :key="f.id" class="px-4 py-3">
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span :class="['rounded-full px-2.5 py-0.5 font-semibold', statusClass[f.status]]">{{ t(`feedbackPage.statuses.${f.status}`) }}</span>
            <span class="font-semibold text-ink-700">{{ t(`feedbackPage.${typeLabelKey[f.type]}`) }}</span>
            <span class="text-ink-400">{{ formatDate(f.createdAt) }}</span>
          </div>
          <p class="mt-1.5 whitespace-pre-line break-words text-sm text-ink-900">{{ f.message }}</p>
          <div v-if="f.hasAttachment" class="mt-1.5">
            <FeedbackAttachment :feedback-id="f.id" :name="f.attachmentName" :type="f.attachmentType" />
          </div>
        </li>
      </ul>
      <p v-else class="py-10 text-center text-sm text-ink-400">{{ t('feedbackPage.historyEmpty') }}</p>
    </div>
  </div>
</template>
