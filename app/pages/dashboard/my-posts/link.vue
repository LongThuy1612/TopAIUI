<script setup lang="ts">
import type { MyPostSubmission, PostSubmission } from '~/types'
import { guestPost } from '~/data/promote'

// New link insert, or ?id= to edit one still pending / sent back for changes.
const { t } = useI18n()
definePageMeta({ layout: 'dashboard', middleware: 'auth', key: route => route.fullPath })
const { authHeaders } = useAuth()
const route = useRoute()
const localePath = useLocalePath()
const editId = computed(() => (typeof route.query.id === 'string' ? route.query.id : ''))

const [{ data }, { data: articles }, { data: one }] = await Promise.all([
  useFetch<{ postCredits: number; items: MyPostSubmission[] }>('/api/me/posts', { key: 'my-posts', headers: () => authHeaders() }),
  useFetch<{ id: string; title: string; slug: string }[]>('/api/articles/options', { headers: () => authHeaders() }),
  useFetch<PostSubmission>(() => `/api/me/posts/${editId.value}`, { headers: () => authHeaders(), immediate: !!editId.value })
])
const existing = computed(() => (editId.value && one.value?.id === editId.value && one.value.type === 'LINK_INSERT' && ['PENDING', 'CHANGES_REQUESTED'].includes(one.value.status) ? one.value : null))
const credits = computed(() => data.value?.postCredits ?? 0)
const cost = guestPost.credits.LINK_INSERT

const form = reactive({ targetUrl: '', anchorText: '', articleId: '', note: '' })
watch(existing, (s) => {
  if (s) Object.assign(form, { targetUrl: s.targetUrl ?? '', anchorText: s.anchorText ?? '', articleId: s.articleId ?? '', note: s.note ?? '' })
}, { immediate: true })

const saving = ref(false)
const error = ref('')
const validUrl = computed(() => { try { return ['http:', 'https:'].includes(new URL(form.targetUrl.trim()).protocol) } catch { return false } })
const problems = computed(() => {
  const p: string[] = []
  if (!validUrl.value) p.push(t('linkForm.needUrl'))
  if (form.anchorText.trim().length < 2) p.push(t('linkForm.needAnchor'))
  if (!existing.value && credits.value < cost) p.push(t('postForm.needCredits', { n: cost }))
  return p
})

async function submit() {
  if (problems.value.length || saving.value) return
  if (!existing.value && !confirm(t('postForm.confirmSpend', { n: cost }))) return
  saving.value = true
  error.value = ''
  try {
    const body = { type: 'LINK_INSERT', ...form }
    if (existing.value) await $fetch(`/api/me/posts/${existing.value.id}`, { method: 'PATCH', headers: authHeaders(), body })
    else await $fetch('/api/me/posts', { method: 'POST', headers: authHeaders(), body })
    await Promise.all([refreshNuxtData('my-posts'), refreshNuxtData('my-orders')])
    await navigateTo(localePath('/dashboard/my-posts'))
  } catch (e: any) {
    error.value = e?.data?.message || t('admin.saveError')
    saving.value = false
  }
}

useSeoMeta({ title: () => `${t('linkForm.title')} — TopAICollection` })
</script>

<template>
  <div class="max-w-2xl">
    <NuxtLinkLocale to="/dashboard/my-posts" class="text-sm text-ink-500 hover:text-brand-600">← {{ t('myPostsPage.title') }}</NuxtLinkLocale>
    <h1 class="mt-2 text-xl font-extrabold text-ink-900">{{ existing ? t('linkForm.editTitle') : t('linkForm.title') }}</h1>

    <p v-if="editId && !existing" class="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{{ t('postForm.notEditable') }}</p>
    <template v-else>
      <div v-if="existing?.status === 'CHANGES_REQUESTED' && existing.adminNote" class="mt-4 rounded-lg bg-orange-50 px-4 py-3 text-sm text-orange-800">
        <b>{{ t('myPostsPage.editorNote') }}:</b> <span class="whitespace-pre-line">{{ existing.adminNote }}</span>
      </div>
      <p class="mt-4 rounded-xl bg-ink-100/40 px-4 py-3 text-sm text-ink-700">{{ t('linkForm.intro', { n: cost }) }}</p>

      <div class="mt-6 space-y-5">
        <label class="block">
          <span class="text-sm font-semibold text-ink-900">{{ t('linkForm.fieldUrl') }} *</span>
          <input v-model="form.targetUrl" type="url" placeholder="https://" class="mt-1.5 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400">
        </label>
        <label class="block">
          <span class="text-sm font-semibold text-ink-900">{{ t('linkForm.fieldAnchor') }} *</span>
          <input v-model="form.anchorText" maxlength="80" class="mt-1.5 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400">
        </label>
        <label class="block">
          <span class="text-sm font-semibold text-ink-900">{{ t('linkForm.fieldArticle') }}</span>
          <select v-model="form.articleId" class="mt-1.5 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400">
            <option value="">{{ t('linkForm.editorChooses') }}</option>
            <option v-for="a in articles ?? []" :key="a.id" :value="a.id">{{ a.title }}</option>
          </select>
        </label>
        <label class="block">
          <span class="text-sm font-semibold text-ink-900">{{ t('linkForm.fieldNote') }}</span>
          <textarea v-model="form.note" maxlength="500" rows="3" :placeholder="t('linkForm.notePlaceholder')" class="mt-1.5 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400" />
        </label>
      </div>

      <div class="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          :disabled="saving || problems.length > 0"
          class="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          @click="submit"
        >
          {{ existing ? t('postForm.resubmit') : t('postForm.submit', { n: cost }) }}
        </button>
        <span class="text-sm text-ink-500">{{ t('myPostsPage.myCredits') }}: <b>{{ credits }}</b></span>
        <NuxtLinkLocale v-if="!existing && credits < cost" to="/post-or-insert" class="text-sm font-semibold text-brand-600 hover:underline">{{ t('myPostsPage.buyMore') }}</NuxtLinkLocale>
      </div>
      <ul v-if="problems.length" class="mt-2 list-disc pl-5 text-xs text-ink-500">
        <li v-for="p in problems" :key="p">{{ p }}</li>
      </ul>
      <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>
    </template>
  </div>
</template>
