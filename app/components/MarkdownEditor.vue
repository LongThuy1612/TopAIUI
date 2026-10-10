<script setup lang="ts">
import { markdownRenderer } from '#shared/markdown'
import { guestPost } from '~/data/promote'

// Markdown textarea with a Preview tab (rendered exactly like the public page), an image
// button (uploads to `uploadUrl`, inserts ![](url) at the cursor) and live counters.
// minWords / maxLinks: shown as limits (red when not met); omit for no limit.
const props = defineProps<{ uploadUrl: string; minWords?: number; maxLinks?: number; rows?: number }>()
const content = defineModel<string>({ required: true })
const busy = defineModel<boolean>('busy', { default: false })

const { t } = useI18n()
const { authHeaders } = useAuth()

const tab = ref<'write' | 'preview'>('write')
const renderer = markdownRenderer(guestPost.linkRel)
const stats = computed(() => renderer.stats(content.value))
const preview = computed(() => (tab.value === 'preview' ? renderer.render(content.value) : ''))

const textarea = ref<HTMLTextAreaElement | null>(null)
// Cursor position when the textarea last lost focus (clicking the image button blurs it).
const caret = ref<number | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const error = ref('')

async function onPick(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  error.value = ''
  if (file.size > 5 * 1024 * 1024) { error.value = t('myTool.upload.tooLarge'); return }
  busy.value = true
  try {
    const body = new FormData()
    body.append('file', file)
    const { url } = await $fetch<{ url: string }>(props.uploadUrl, { method: 'POST', headers: authHeaders(), body })
    const at = Math.min(caret.value ?? content.value.length, content.value.length)
    content.value = `${content.value.slice(0, at)}\n\n![](${url})\n\n${content.value.slice(at)}`
    caret.value = at + url.length + 9
  } catch (err: any) {
    error.value = err?.data?.message || t('admin.saveError')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="rounded-xl border border-ink-200">
    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 px-3 py-2">
      <div class="flex gap-1">
        <button
          v-for="v in (['write', 'preview'] as const)"
          :key="v"
          type="button"
          :class="['rounded-md px-3 py-1 text-sm font-semibold', tab === v ? 'bg-ink-100 text-ink-900' : 'text-ink-500 hover:text-ink-800']"
          @click="tab = v"
        >{{ t(`articleEditor.${v}`) }}</button>
      </div>
      <div class="flex flex-wrap items-center gap-3 text-xs text-ink-500">
        <span :class="minWords && stats.words < minWords ? 'font-semibold text-red-600' : ''">
          {{ t('articleEditor.words', { n: stats.words }) }}<template v-if="minWords"> / {{ t('articleEditor.min', { n: minWords }) }}</template>
        </span>
        <span v-if="maxLinks !== undefined" :class="stats.externalLinks.length > maxLinks ? 'font-semibold text-red-600' : ''">
          {{ t('articleEditor.links', { n: stats.externalLinks.length, max: maxLinks }) }}
        </span>
        <button type="button" :disabled="busy" class="rounded-md border border-ink-200 px-2.5 py-1 font-semibold text-ink-700 hover:border-brand-300 disabled:opacity-50" @click="fileInput?.click()">
          {{ busy ? t('articleEditor.uploading') : t('articleEditor.addImage') }}
        </button>
        <input ref="fileInput" type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="hidden" @change="onPick">
      </div>
    </div>
    <textarea
      v-show="tab === 'write'"
      ref="textarea"
      v-model="content"
      :rows="rows ?? 22"
      @blur="caret = ($event.target as HTMLTextAreaElement).selectionStart"
      :placeholder="t('articleEditor.placeholder')"
      class="block w-full resize-y rounded-b-xl px-4 py-3 font-mono text-sm leading-6 text-ink-900 outline-none"
    />
    <div v-if="tab === 'preview'" class="min-h-[300px] px-5 py-4">
      <ArticleBody v-if="content.trim()" :html="preview" />
      <p v-else class="text-sm text-ink-400">{{ t('articleEditor.nothing') }}</p>
    </div>
    <p v-if="error" class="border-t border-ink-100 px-4 py-2 text-sm text-red-600">{{ error }}</p>
    <p class="border-t border-ink-100 px-4 py-2 text-xs text-ink-400">{{ t('articleEditor.help') }}</p>
  </div>
</template>
