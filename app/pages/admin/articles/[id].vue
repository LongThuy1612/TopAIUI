<script setup lang="ts">
// Admin article editor; /admin/articles/new creates one.
const { t } = useI18n()
definePageMeta({ layout: 'dashboard', middleware: ['auth', 'admin'], key: route => route.fullPath })
const { authHeaders } = useAuth()
const route = useRoute()
const localePath = useLocalePath()
const id = computed(() => String(route.params.id))
const isNew = computed(() => id.value === 'new')

interface AdminArticle {
  id: string; slug: string; title: string; excerpt: string | null; content: string; coverUrl: string | null; externalUrl: string | null
  kind: 'EDITORIAL' | 'GUEST_POST'; status: 'DRAFT' | 'PUBLISHED'; authorName: string | null; publishedAt: string | null
  submissions: { id: string; type: string; status: string; targetUrl: string | null; anchorText: string | null; user: { email: string } }[]
}

const { data: article, error: loadError, refresh } = await useFetch<AdminArticle>(() => `/api/admin/articles/${id.value}`, {
  headers: () => authHeaders(),
  immediate: !isNew.value
})

const form = reactive({ title: '', slug: '', excerpt: '', coverUrl: '', authorName: 'TopAICollection', content: '', externalUrl: '', status: 'DRAFT' as 'DRAFT' | 'PUBLISHED' })
// "link": an AI News entry whose title opens someone else's page (the text is optional).
const mode = ref<'article' | 'link'>('article')
watch(article, (a) => {
  if (!a) return
  Object.assign(form, { title: a.title, slug: a.slug, excerpt: a.excerpt ?? '', coverUrl: a.coverUrl ?? '', authorName: a.authorName ?? '', content: a.content, externalUrl: a.externalUrl ?? '', status: a.status })
  mode.value = a.externalUrl ? 'link' : 'article'
}, { immediate: true })
// Guest posts and articles carrying link inserts stay normal articles.
const canBeLink = computed(() => isNew.value || (article.value?.kind !== 'GUEST_POST' && !article.value?.submissions.length))

// Reads the page's title / summary / image; fills the empty fields (or all, when asked).
const fetching = ref(false)
async function fetchPreview() {
  if (fetching.value || !form.externalUrl.trim()) return
  fetching.value = true
  error.value = ''
  try {
    const p = await $fetch<{ title: string; excerpt: string; coverUrl: string | null }>('/api/admin/articles/preview', { method: 'POST', headers: authHeaders(), body: { url: form.externalUrl } })
    const replace = !form.title && !form.excerpt && !form.coverUrl ? true : confirm(t('adminArticles.replaceFetched'))
    if (p.title && (replace || !form.title)) form.title = p.title
    if (p.excerpt && (replace || !form.excerpt)) form.excerpt = p.excerpt
    if (p.coverUrl && (replace || !form.coverUrl)) form.coverUrl = p.coverUrl
  } catch (e: any) {
    error.value = e?.data?.message || t('admin.saveError')
  } finally {
    fetching.value = false
  }
}

const busyCover = ref(false)
const busyBody = ref(false)
const saving = ref(false)
const error = ref('')
const saved = ref(false)

// Link inserts placed here: the URL must appear in the text (checked when marking done).
const linkInserts = computed(() => (article.value?.submissions ?? []).filter(s => s.type === 'LINK_INSERT' && s.targetUrl))
const contains = (url: string | null) => !!url && form.content.includes(url)

async function save(status?: 'DRAFT' | 'PUBLISHED') {
  if (saving.value) return
  const before = form.status
  if (status) form.status = status
  saving.value = true
  error.value = ''
  saved.value = false
  try {
    const body = { ...form, externalUrl: mode.value === 'link' ? form.externalUrl : '' }
    if (isNew.value) {
      const res = await $fetch<{ id: string }>('/api/admin/articles', { method: 'POST', headers: authHeaders(), body })
      await navigateTo(localePath(`/admin/articles/${res.id}`), { replace: true })
    } else {
      await $fetch(`/api/admin/articles/${id.value}`, { method: 'PATCH', headers: authHeaders(), body })
      // Reload: the View link needs the saved status / slug.
      await refresh()
      saved.value = true
    }
  } catch (e: any) {
    error.value = e?.data?.message || t('admin.saveError')
    form.status = before
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!confirm(t('adminArticles.deleteConfirm'))) return
  try {
    await $fetch(`/api/admin/articles/${id.value}`, { method: 'DELETE', headers: authHeaders() })
    await navigateTo(localePath('/admin/articles'))
  } catch (e: any) {
    error.value = e?.data?.message || t('admin.saveError')
  }
}

useSeoMeta({ title: () => `${t('adminArticles.title')} — TopAICollection` })
</script>

<template>
  <div class="max-w-4xl">
    <NuxtLinkLocale to="/admin/articles" class="text-sm text-ink-500 hover:text-brand-600">← {{ t('adminArticles.title') }}</NuxtLinkLocale>
    <p v-if="!isNew && loadError" class="mt-4 text-sm text-red-600">{{ t('adminArticles.notFound') }}</p>
    <template v-else>
      <div class="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 class="text-xl font-extrabold text-ink-900">{{ isNew ? t('adminArticles.new') : form.title }}</h1>
        <a v-if="!isNew && article?.status === 'PUBLISHED' && article.externalUrl" :href="article.externalUrl" target="_blank" rel="noopener" class="text-sm font-semibold text-brand-600 hover:underline">{{ t('adminArticles.view') }} ↗</a>
        <NuxtLinkLocale v-else-if="!isNew && article?.status === 'PUBLISHED'" :to="`/ai-news/${article.slug}`" target="_blank" class="text-sm font-semibold text-brand-600 hover:underline">{{ t('adminArticles.view') }} ↗</NuxtLinkLocale>
      </div>
      <p v-if="article?.kind === 'GUEST_POST'" class="mt-1 text-xs text-ink-500">{{ t('adminArticles.kinds.GUEST_POST') }}</p>

      <div v-if="linkInserts.length" class="mt-4 rounded-xl border border-ink-100 p-4 text-sm">
        <div class="font-semibold text-ink-900">{{ t('adminArticles.linkInserts') }}</div>
        <ul class="mt-2 space-y-1">
          <li v-for="s in linkInserts" :key="s.id" class="flex flex-wrap items-center gap-2 text-xs">
            <span :class="contains(s.targetUrl) ? 'text-emerald-600' : 'text-amber-600'">{{ contains(s.targetUrl) ? '✓' : '•' }}</span>
            <code class="select-all rounded bg-ink-100 px-1.5 py-0.5">[{{ s.anchorText }}]({{ s.targetUrl }})</code>
            <span class="text-ink-400">{{ s.user.email }} · {{ t(`myPostsPage.statuses.${s.status}`) }}</span>
          </li>
        </ul>
      </div>

      <div v-if="canBeLink" class="mt-5 flex gap-2">
        <button
          v-for="m in (['article', 'link'] as const)"
          :key="m"
          type="button"
          :class="['rounded-full border px-3 py-1.5 text-sm font-semibold transition', mode === m ? 'border-brand-500 bg-brand-500 text-white' : 'border-ink-200 text-ink-600 hover:border-brand-300']"
          @click="mode = m"
        >
          {{ t(`adminArticles.modes.${m}`) }}
        </button>
      </div>

      <div class="mt-6 space-y-5">
        <div v-if="mode === 'link'">
          <span class="text-sm font-semibold text-ink-900">{{ t('adminArticles.externalUrl') }} *</span>
          <div class="mt-1.5 flex gap-2">
            <input v-model="form.externalUrl" type="url" maxlength="2000" placeholder="https://" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400" @keydown.enter.prevent="fetchPreview">
            <button type="button" :disabled="fetching || !form.externalUrl.trim()" class="shrink-0 rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-900 hover:border-brand-300 disabled:opacity-50" @click="fetchPreview">
              {{ fetching ? t('adminArticles.fetching') : t('adminArticles.fetchInfo') }}
            </button>
          </div>
          <p class="mt-1 text-xs text-ink-400">{{ t('adminArticles.externalHint') }}</p>
        </div>
        <label class="block">
          <span class="text-sm font-semibold text-ink-900">{{ t('postForm.fieldTitle') }} *</span>
          <input v-model="form.title" maxlength="200" class="mt-1.5 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400">
        </label>
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="block">
            <span class="text-sm font-semibold text-ink-900">{{ t('adminArticles.slug') }}</span>
            <input v-model="form.slug" :placeholder="t('adminArticles.slugAuto')" class="mt-1.5 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400">
          </label>
          <label class="block">
            <span class="text-sm font-semibold text-ink-900">{{ t('adminArticles.author') }}</span>
            <input v-model="form.authorName" maxlength="80" class="mt-1.5 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400">
          </label>
        </div>
        <label class="block">
          <span class="text-sm font-semibold text-ink-900">{{ t('postForm.fieldExcerpt') }}</span>
          <textarea v-model="form.excerpt" maxlength="300" rows="2" class="mt-1.5 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400" />
        </label>
        <div>
          <span class="text-sm font-semibold text-ink-900">{{ t('postForm.fieldCover') }}</span>
          <CoverImageField v-model="form.coverUrl" v-model:busy="busyCover" upload-url="/api/admin/articles/images" class="mt-1.5" />
        </div>
        <div>
          <span class="text-sm font-semibold text-ink-900">{{ t('postForm.fieldContent') }}{{ mode === 'link' ? ` (${t('adminArticles.optional')})` : ' *' }}</span>
          <MarkdownEditor v-model="form.content" v-model:busy="busyBody" upload-url="/api/admin/articles/images" class="mt-1.5" />
        </div>
      </div>

      <div class="mt-6 flex flex-wrap items-center gap-3">
        <button type="button" :disabled="saving || busyCover || busyBody || fetching" class="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50" @click="save('PUBLISHED')">
          {{ form.status === 'PUBLISHED' && !isNew ? t('adminArticles.saveLive') : t('adminArticles.publish') }}
        </button>
        <button type="button" :disabled="saving || busyCover || busyBody || fetching" class="rounded-lg border border-ink-200 px-5 py-2.5 text-sm font-semibold text-ink-900 hover:border-brand-300 disabled:opacity-50" @click="save('DRAFT')">
          {{ form.status === 'PUBLISHED' && !isNew ? t('adminArticles.unpublish') : t('adminArticles.saveDraft') }}
        </button>
        <button v-if="!isNew" type="button" class="ml-auto text-sm font-semibold text-red-500 hover:text-red-600" @click="remove">{{ t('adminArticles.delete') }}</button>
      </div>
      <p v-if="saved" class="mt-2 text-sm text-emerald-600">{{ t('adminArticles.saved') }}</p>
      <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>
    </template>
  </div>
</template>
