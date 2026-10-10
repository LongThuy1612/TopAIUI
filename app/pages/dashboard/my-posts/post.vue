<script setup lang="ts">
import type { MyPostSubmission, PostSubmission } from '~/types'
import { guestPost } from '~/data/promote'
import { markdownRenderer } from '#shared/markdown'

// New guest post, or ?id= to edit one still pending / sent back for changes.
const { t } = useI18n()
definePageMeta({ layout: 'dashboard', middleware: 'auth', key: route => route.fullPath })
const { authHeaders } = useAuth()
const route = useRoute()
const editId = computed(() => (typeof route.query.id === 'string' ? route.query.id : ''))

// Balance from the list (shared key); the full text of the one being edited on its own.
const [{ data }, { data: one }] = await Promise.all([
  useFetch<{ postCredits: number; items: MyPostSubmission[] }>('/api/me/posts', { key: 'my-posts', headers: authHeaders() }),
  useFetch<PostSubmission>(() => `/api/me/posts/${editId.value}`, { headers: authHeaders(), immediate: !!editId.value })
])
const existing = computed(() => (editId.value && one.value?.id === editId.value && one.value.type === 'GUEST_POST' && ['PENDING', 'CHANGES_REQUESTED'].includes(one.value.status) ? one.value : null))
const credits = computed(() => data.value?.postCredits ?? 0)
const cost = guestPost.credits.GUEST_POST

const form = reactive({ title: '', excerpt: '', coverUrl: '', content: '' })
watch(existing, (s) => {
  if (s) Object.assign(form, { title: s.title ?? '', excerpt: s.excerpt ?? '', coverUrl: s.coverUrl ?? '', content: s.content ?? '' })
}, { immediate: true })

const uploadingCover = ref(false)
const uploadingBody = ref(false)
const saving = ref(false)
const error = ref('')

const stats = computed(() => markdownRenderer(guestPost.linkRel).stats(form.content))
const problems = computed(() => {
  const p: string[] = []
  if (form.title.trim().length < 10) p.push(t('postForm.needTitle'))
  if (!form.coverUrl) p.push(t('postForm.needCover'))
  if (stats.value.words < guestPost.minWords) p.push(t('postForm.needWords', { n: guestPost.minWords }))
  if (stats.value.externalLinks.length > guestPost.maxLinks) p.push(t('postForm.tooManyLinks', { n: guestPost.maxLinks }))
  if (!existing.value && credits.value < cost) p.push(t('postForm.needCredits', { n: cost }))
  return p
})

async function submit() {
  if (problems.value.length || saving.value) return
  if (!existing.value && !confirm(t('postForm.confirmSpend', { n: cost }))) return
  saving.value = true
  error.value = ''
  try {
    const body = { type: 'GUEST_POST', ...form }
    if (existing.value) await $fetch(`/api/me/posts/${existing.value.id}`, { method: 'PATCH', headers: authHeaders(), body })
    else await $fetch('/api/me/posts', { method: 'POST', headers: authHeaders(), body })
    await Promise.all([refreshNuxtData('my-posts'), refreshNuxtData('my-orders')])
    await navigateTo('/dashboard/my-posts')
  } catch (e: any) {
    error.value = e?.data?.message || t('admin.saveError')
    saving.value = false
  }
}

useSeoMeta({ title: () => `${t('postForm.title')} — TopAICollection` })
</script>

<template>
  <div class="max-w-4xl">
    <NuxtLink to="/dashboard/my-posts" class="text-sm text-ink-500 hover:text-brand-600">← {{ t('myPostsPage.title') }}</NuxtLink>
    <h1 class="mt-2 text-xl font-extrabold text-ink-900">{{ existing ? t('postForm.editTitle') : t('postForm.title') }}</h1>

    <p v-if="editId && !existing" class="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{{ t('postForm.notEditable') }}</p>
    <template v-else>
      <div v-if="existing?.status === 'CHANGES_REQUESTED' && existing.adminNote" class="mt-4 rounded-lg bg-orange-50 px-4 py-3 text-sm text-orange-800">
        <b>{{ t('myPostsPage.editorNote') }}:</b> <span class="whitespace-pre-line">{{ existing.adminNote }}</span>
      </div>

      <ul class="mt-4 list-disc space-y-1 rounded-xl bg-ink-100/40 px-8 py-4 text-sm text-ink-700">
        <li>{{ t('postForm.rules.cost', { n: cost }) }}</li>
        <li>{{ t('postForm.rules.words', { n: guestPost.minWords }) }}</li>
        <li>{{ t('postForm.rules.links', { n: guestPost.maxLinks }) }}</li>
        <li>{{ t('postForm.rules.topic') }}</li>
        <li>{{ t('postForm.rules.review') }}</li>
      </ul>

      <div class="mt-6 space-y-5">
        <label class="block">
          <span class="text-sm font-semibold text-ink-900">{{ t('postForm.fieldTitle') }} *</span>
          <input v-model="form.title" maxlength="120" class="mt-1.5 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400">
        </label>
        <label class="block">
          <span class="text-sm font-semibold text-ink-900">{{ t('postForm.fieldExcerpt') }}</span>
          <textarea v-model="form.excerpt" maxlength="300" rows="2" class="mt-1.5 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400" />
          <span class="text-xs text-ink-400">{{ t('postForm.excerptHint') }}</span>
        </label>
        <div>
          <span class="text-sm font-semibold text-ink-900">{{ t('postForm.fieldCover') }} *</span>
          <CoverImageField v-model="form.coverUrl" v-model:busy="uploadingCover" upload-url="/api/me/posts/images" class="mt-1.5" />
        </div>
        <div>
          <span class="text-sm font-semibold text-ink-900">{{ t('postForm.fieldContent') }} *</span>
          <MarkdownEditor
            v-model="form.content"
            v-model:busy="uploadingBody"
            upload-url="/api/me/posts/images"
            :min-words="guestPost.minWords"
            :max-links="guestPost.maxLinks"
            class="mt-1.5"
          />
        </div>
      </div>

      <div class="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          :disabled="saving || uploadingCover || uploadingBody || problems.length > 0"
          class="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          @click="submit"
        >
          {{ existing ? t('postForm.resubmit') : t('postForm.submit', { n: cost }) }}
        </button>
        <span class="text-sm text-ink-500">{{ t('myPostsPage.myCredits') }}: <b>{{ credits }}</b></span>
        <NuxtLink v-if="!existing && credits < cost" to="/post-or-insert" class="text-sm font-semibold text-brand-600 hover:underline">{{ t('myPostsPage.buyMore') }}</NuxtLink>
      </div>
      <ul v-if="problems.length" class="mt-2 list-disc pl-5 text-xs text-ink-500">
        <li v-for="p in problems" :key="p">{{ p }}</li>
      </ul>
      <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>
    </template>
  </div>
</template>
