<script setup lang="ts">
// One cover image: uploads right away to `uploadUrl` ({ url }); the URL is saved with the form.
const props = defineProps<{ uploadUrl: string }>()
const url = defineModel<string>({ required: true })
const busy = defineModel<boolean>('busy', { default: false })
const { t } = useI18n()
const { authHeaders } = useAuth()
const error = ref('')
const input = ref<HTMLInputElement | null>(null)

async function onPick(e: Event) {
  const el = e.target as HTMLInputElement
  const file = el.files?.[0]
  el.value = ''
  if (!file) return
  error.value = ''
  if (file.size > 5 * 1024 * 1024) { error.value = t('myTool.upload.tooLarge'); return }
  busy.value = true
  try {
    const body = new FormData()
    body.append('file', file)
    url.value = (await $fetch<{ url: string }>(props.uploadUrl, { method: 'POST', headers: authHeaders(), body })).url
  } catch (err: any) {
    error.value = err?.data?.message || t('admin.saveError')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div>
    <button
      type="button"
      :disabled="busy"
      class="flex aspect-[16/9] w-full max-w-md items-center justify-center overflow-hidden rounded-xl border border-dashed border-ink-200 bg-ink-100/30 text-sm text-ink-500 hover:border-brand-300 disabled:opacity-60"
      @click="input?.click()"
    >
      <img v-if="url" :src="url" alt="" class="h-full w-full object-cover">
      <span v-else>{{ busy ? t('articleEditor.uploading') : t('articleEditor.uploadCover') }}</span>
    </button>
    <div class="mt-1.5 flex flex-wrap gap-3 text-xs">
      <button v-if="url" type="button" class="font-semibold text-brand-600 hover:text-brand-700" @click="input?.click()">{{ t('articleEditor.changeCover') }}</button>
      <span class="text-ink-400">{{ t('articleEditor.coverHint') }}</span>
    </div>
    <input ref="input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="hidden" @change="onPick">
    <p v-if="error" class="mt-1 text-sm text-red-600">{{ error }}</p>
  </div>
</template>
