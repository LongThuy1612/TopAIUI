<script setup lang="ts">
// Opens a feedback attachment (screenshot / screen recording) in a preview.
// The file is private: it is fetched with the auth header and shown from a
// blob URL, since an <img src> or a link can't send the token.
const props = defineProps<{
  feedbackId: string
  name: string | null
  type: string | null
}>()

const { t } = useI18n()
const { authHeaders } = useAuth()

const open = ref(false)
const loading = ref(false)
const failed = ref(false)
const url = ref<string | null>(null)
const isVideo = computed(() => !!props.type?.startsWith('video/'))
const label = computed(() => props.name || t('feedbackPage.attachment'))

async function show() {
  open.value = true
  if (url.value || loading.value) return
  loading.value = true
  failed.value = false
  try {
    const blob = await $fetch<Blob>(`/api/feedback/${props.feedbackId}/attachment`, { headers: authHeaders(), responseType: 'blob' })
    url.value = URL.createObjectURL(blob)
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

function close() {
  open.value = false
}

function onKeydown(e: KeyboardEvent) {
  if (open.value && e.key === 'Escape') close()
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  if (url.value) URL.revokeObjectURL(url.value)
})
</script>

<template>
  <button type="button" class="inline-flex max-w-full items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700" :title="label" @click="show">
    <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m18.4 11.1-6.9 6.9a4.5 4.5 0 0 1-6.4-6.4l7.6-7.6a3 3 0 0 1 4.2 4.2l-7.6 7.6a1.5 1.5 0 0 1-2.1-2.1l6.9-6.9" /></svg>
    <span class="truncate">{{ label }}</span>
  </button>

  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60 p-4" @click.self="close">
      <div class="flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl" role="dialog" aria-modal="true" :aria-label="label">
        <div class="flex items-center gap-3 border-b border-ink-100 px-4 py-3">
          <span class="min-w-0 flex-1 truncate text-sm font-semibold text-ink-900">{{ label }}</span>
          <a v-if="url" :href="url" :download="name || undefined" class="text-sm font-semibold text-brand-600 hover:text-brand-700">{{ t('feedbackPage.download') }}</a>
          <button type="button" class="flex h-8 w-8 items-center justify-center rounded-lg text-ink-600 hover:bg-ink-100/60" :aria-label="t('header.closeMenu')" @click="close">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
        <div class="flex min-h-[200px] items-center justify-center overflow-auto bg-ink-100/40 p-4">
          <p v-if="loading" class="text-sm text-ink-500">{{ t('websiteInsights.loading') }}</p>
          <p v-else-if="failed" class="text-sm text-red-600">{{ t('feedbackPage.attachmentError') }}</p>
          <video v-else-if="url && isVideo" :src="url" controls class="max-h-[75vh] max-w-full" />
          <img v-else-if="url" :src="url" :alt="label" class="max-h-[75vh] max-w-full object-contain">
        </div>
      </div>
    </div>
  </Teleport>
</template>
