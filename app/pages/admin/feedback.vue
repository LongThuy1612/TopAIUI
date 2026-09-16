<script setup lang="ts">
const { t } = useI18n()
const { token, load } = useAdminAuth()
load()

if (import.meta.client && !token.value) {
  await navigateTo('/admin/login')
}

type FeedbackType = 'feature' | 'issue' | 'billing' | 'other'

const feedbackTypes: { key: FeedbackType; labelKey: string }[] = [
  { key: 'feature', labelKey: 'typeFeature' },
  { key: 'issue', labelKey: 'typeIssue' },
  { key: 'billing', labelKey: 'typeBilling' },
  { key: 'other', labelKey: 'typeOther' }
]

const selectedType = ref<FeedbackType>('feature')
const description = ref('')
const maxLength = 1000
const attachmentName = ref('')
const fileInput = ref<HTMLInputElement>()

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  attachmentName.value = file?.name ?? ''
}

function submitFeedback() {
  alert('Thank you for your feedback!')
  description.value = ''
  attachmentName.value = ''
  selectedType.value = 'feature'
}

useSeoMeta({
  title: () => `${t('feedbackPage.title')} — TopAICollection`
})
</script>

<template>
  <div class="flex min-h-[calc(100vh-64px)] w-full">
    <AdminSidebar />

    <div class="min-w-0 flex-1 px-6 py-6 lg:px-8">
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
              <span class="whitespace-nowrap text-ink-900">{{ t(`feedbackPage.${type.labelKey}`) }}</span>
            </label>
          </div>
        </div>

        <div class="mt-6">
          <div class="text-sm font-semibold text-ink-900">{{ t('feedbackPage.detailedDescription') }}</div>
          <div class="relative mt-2">
            <textarea
              v-model="description"
              :maxlength="maxLength"
              rows="6"
              :placeholder="t('feedbackPage.descriptionPlaceholder')"
              class="w-full resize-y rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
            ></textarea>
            <span class="pointer-events-none absolute bottom-2 right-3 text-xs text-ink-400">{{ description.length }}/{{ maxLength }}</span>
          </div>
        </div>

        <div class="mt-6">
          <div class="text-sm font-semibold text-ink-900">{{ t('feedbackPage.attachment') }}</div>
          <div class="mt-2">
            <button
              type="button"
              class="flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-600 hover:bg-brand-100"
              @click="fileInput?.click()"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 16V4m0 0L7 9m5-5 5 5M5 20h14" /></svg>
              {{ t('feedbackPage.upload') }}
            </button>
            <input ref="fileInput" type="file" class="hidden" @change="onFileChange">
            <span v-if="attachmentName" class="ml-2 text-sm text-ink-900">{{ attachmentName }}</span>
          </div>
          <p class="mt-2 text-xs text-ink-900">{{ t('feedbackPage.uploadHint') }}</p>
        </div>

        <button type="submit" class="mt-6 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-600">
          {{ t('feedbackPage.submit') }}
        </button>
      </form>
    </div>
  </div>
</template>
