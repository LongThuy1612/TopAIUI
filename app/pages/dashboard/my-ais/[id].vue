<script setup lang="ts">
import type { Category, Tool } from '~/types'

// The owner's page for one submitted tool: shows where it is in review and,
// while it can still be edited, the form for its English listing.
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const { t } = useI18n()
const route = useRoute()
const { authHeaders } = useAuth()
const toolId = String(route.params.id)

const { data: tool, refresh, error: loadError } = await useFetch<Tool>(`/api/me/tools/${toolId}`, {
  headers: authHeaders(),
  watch: false
})
const { data: categories } = await useFetch<Category[]>('/api/categories')

const pricingOptions = ['FREE', 'FREEMIUM', 'PAID'] as const

const form = reactive({
  name: '',
  logoUrl: '',
  pricingType: 'FREEMIUM' as (typeof pricingOptions)[number],
  categorySlugs: [] as string[],
  twitterUrl: '',
  discordUrl: '',
  images: [] as string[],
  shortDesc: '',
  description: '',
  whatIs: '',
  howToUse: '',
  coreFeatures: '',
  useCases: ''
})

// Categories and screenshots are only sent when changed: a save never drops
// categories nobody touched, nor the preview image the AI job took from the website
// (sending images: [] would clear screenshotUrl).
let categoriesSnapshot = '[]'
let imagesSnapshot = '[]'
// The tool's own categories may not be in the public list (it only has ones with published tools).
const categoryOptions = computed(() => {
  const list = (categories.value ?? []).map(c => ({ slug: c.slug, name: c.name }))
  for (const c of tool.value?.categories ?? []) {
    if (!list.some(o => o.slug === c.slug)) list.push({ slug: c.slug, name: c.name })
  }
  return list
})

// A published tool is changed through a paid update: while one is open (DRAFT /
// SUBMITTED) the same form edits the proposed changes instead of the tool itself.
const updating = computed(() => tool.value?.status === 'PUBLISHED' && ['DRAFT', 'SUBMITTED'].includes(tool.value?.updateRequest?.status ?? ''))
const editable = computed(() => !!tool.value?.canEdit || updating.value)

watch(tool, (src) => {
  if (!src) return
  const tr = src.translations?.[0]
  Object.assign(form, {
    name: src.name ?? '',
    logoUrl: src.logoUrl ?? '',
    pricingType: src.pricingType ?? 'FREEMIUM',
    categorySlugs: (src.categories ?? []).map(c => c.slug),
    twitterUrl: src.twitterUrl ?? '',
    discordUrl: src.discordUrl ?? '',
    // Entries are a URL string or { url } (crawled tools) — same as the public page reads.
    images: (Array.isArray(src.images) ? src.images : [])
      .map(i => (typeof i === 'string' ? i : (i as { url?: string } | null)?.url))
      .filter((u): u is string => !!u),
    shortDesc: tr?.shortDesc ?? '',
    description: tr?.description ?? '',
    whatIs: tr?.whatIs ?? '',
    howToUse: tr?.howToUse ?? '',
    coreFeatures: (tr?.coreFeatures ?? []).join('\n'),
    useCases: (tr?.useCases ?? []).join('\n')
  })
  // An update being prepared: show the proposed values over the live ones.
  const changes = updating.value ? src.updateRequest?.changes : null
  if (changes) {
    const f = changes.fields ?? {}
    if (f.name !== undefined) form.name = f.name
    if (f.logoUrl !== undefined) form.logoUrl = f.logoUrl ?? ''
    if (f.pricingType !== undefined) form.pricingType = f.pricingType
    if (f.twitterUrl !== undefined) form.twitterUrl = f.twitterUrl ?? ''
    if (f.discordUrl !== undefined) form.discordUrl = f.discordUrl ?? ''
    if (f.images !== undefined) form.images = [...f.images]
    if (changes.categorySlugs) form.categorySlugs = [...changes.categorySlugs]
    if (changes.content) {
      const c = changes.content
      Object.assign(form, {
        shortDesc: c.shortDesc ?? '', description: c.description ?? '', whatIs: c.whatIs ?? '', howToUse: c.howToUse ?? '',
        coreFeatures: c.coreFeatures.join('\n'), useCases: c.useCases.join('\n')
      })
    }
  }
  categoriesSnapshot = JSON.stringify(form.categorySlugs)
  imagesSnapshot = JSON.stringify(form.images)
}, { immediate: true })

// Where the tool is in its review — drives the banner at the top.
const stage = computed(() => {
  const s = tool.value
  if (!s) return null
  if (s.status === 'PUBLISHED') return updating.value ? `update${s.updateRequest!.status === 'DRAFT' ? 'Draft' : 'Review'}` : 'live'
  if (s.status === 'CANCELED') return 'rejected'
  if (!s.step2) return 'draft'
  // 0 queued / -1 retrying = still being written; done or failed for good → with the admin.
  return s.submitMode === 'auto' && (s.aiSync === 0 || s.aiSync === -1) ? 'writing' : 'review'
})
const stageClass: Record<string, string> = {
  live: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  updateDraft: 'border-amber-200 bg-amber-50 text-amber-800',
  updateReview: 'border-brand-200 bg-brand-50 text-brand-800',
  rejected: 'border-red-200 bg-red-50 text-red-800',
  draft: 'border-amber-200 bg-amber-50 text-amber-800',
  writing: 'border-brand-200 bg-brand-50 text-brand-800',
  review: 'border-brand-200 bg-brand-50 text-brand-800'
}

// True while ToolImageFields is uploading — saving waits for it.
const uploading = ref(false)

const lines = (s: string) => s.split('\n').map(x => x.trim()).filter(Boolean)

const saving = ref<'draft' | 'submit' | null>(null)
const message = ref<{ ok: boolean; text: string } | null>(null)

async function save(submit: boolean) {
  message.value = null
  saving.value = submit ? 'submit' : 'draft'
  // Saving a draft of a submitted tool (or update) takes it out of review until it's resubmitted.
  const isUpdate = updating.value
  const wasSubmitted = isUpdate
    ? tool.value?.updateRequest?.status === 'SUBMITTED'
    : tool.value?.status === 'PENDING' && !!tool.value?.step2
  try {
    await $fetch(isUpdate ? `/api/me/tools/${toolId}/update-request` : `/api/me/tools/${toolId}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: {
        ...form,
        categorySlugs: undefined,
        images: undefined,
        ...(JSON.stringify(form.categorySlugs) !== categoriesSnapshot ? { categorySlugs: form.categorySlugs } : {}),
        ...(JSON.stringify(form.images) !== imagesSnapshot ? { images: form.images } : {}),
        coreFeatures: lines(form.coreFeatures),
        useCases: lines(form.useCases),
        submit
      }
    })
    message.value = {
      ok: true,
      text: submit ? t(isUpdate ? 'myTool.update.submitted' : 'myTool.submitted') : wasSubmitted ? t('myTool.savedNeedsResubmit') : t('myTool.saved')
    }
    await refresh()
  } catch (e: any) {
    message.value = { ok: false, text: e?.data?.message || t('myTool.saveError') }
  } finally {
    saving.value = null
  }
}

useSeoMeta({ title: () => `${tool.value?.name ?? t('myAIsPage.title')} — TopAICollection` })

const input = 'w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400'
const label = 'mb-1 block text-xs font-semibold text-ink-600'
</script>

<template>
  <div>
    <NuxtLink to="/dashboard/my-ais" class="flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-brand-600">
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      {{ t('myAIsPage.title') }}
    </NuxtLink>

    <div v-if="loadError || !tool" class="mt-10 text-sm text-ink-400">{{ t('admin.loadError') }}</div>

    <template v-else>
      <h1 class="mt-3 text-xl font-extrabold text-ink-900">{{ tool.name }}</h1>
      <a :href="tool.website" target="_blank" rel="noopener" class="mt-1 block text-sm text-ink-500 hover:text-brand-600">{{ tool.website }}</a>

      <div v-if="stage" :class="['mt-5 rounded-xl border px-4 py-3 text-sm', stageClass[stage]]">
        <p class="font-bold">{{ t(`myTool.stage.${stage}.title`) }}</p>
        <p class="mt-0.5">{{ t(`myTool.stage.${stage}.desc`) }}</p>
        <p v-if="stage === 'rejected' && tool.rejectionReason" class="mt-2 whitespace-pre-line rounded-lg bg-white/70 px-3 py-2">
          <span class="font-semibold">{{ t('myTool.reason') }}:</span> {{ tool.rejectionReason }}
        </p>
        <div v-if="tool.status === 'PUBLISHED'" class="mt-2 flex flex-wrap gap-3">
          <NuxtLink :to="`/tools/${tool.slug}`" class="font-semibold underline">{{ t('myTool.viewPage') }}</NuxtLink>
          <NuxtLink v-if="!updating" :to="{ path: '/update-ai', query: { toolId: tool.id } }" class="font-semibold underline">{{ t('myTool.update.buy') }}</NuxtLink>
        </div>
      </div>

      <!-- How the last paid update ended (only when none is open). -->
      <div
        v-if="tool.status === 'PUBLISHED' && !updating && tool.updateRequest"
        :class="['mt-3 rounded-xl border px-4 py-3 text-sm', tool.updateRequest.status === 'REJECTED' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800']"
      >
        <p class="font-bold">{{ t(`myTool.update.last.${tool.updateRequest.status}`) }}</p>
        <p v-if="tool.updateRequest.rejectionReason" class="mt-1 whitespace-pre-line">
          <span class="font-semibold">{{ t('myTool.reason') }}:</span> {{ tool.updateRequest.rejectionReason }}
        </p>
      </div>

      <form v-if="editable" class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[4fr_5fr]" @submit.prevent="save(true)">
        <div class="min-w-0 space-y-4 rounded-xl border border-ink-100 p-4">
          <label class="block">
            <span :class="label">{{ t('admin.fieldName') }} *</span>
            <input v-model="form.name" type="text" required maxlength="120" :class="input">
          </label>
          <label class="block">
            <span :class="label">{{ t('admin.fieldWebsite') }}</span>
            <input :value="tool.website" type="text" disabled :class="[input, 'bg-ink-100/40 text-ink-400']">
          </label>
          <div>
            <span :class="label">{{ t('admin.fieldCategory') }} *</span>
            <CategoryMultiSelect v-model="form.categorySlugs" :options="categoryOptions" />
          </div>
          <label class="block">
            <span :class="label">{{ t('admin.fieldPricingType') }}</span>
            <select v-model="form.pricingType" :class="input">
              <option v-for="p in pricingOptions" :key="p" :value="p">{{ p }}</option>
            </select>
          </label>
          <label class="block">
            <span :class="label">{{ t('admin.fieldTwitterUrl') }}</span>
            <input v-model="form.twitterUrl" type="url" placeholder="https://" :class="input">
          </label>
          <label class="block">
            <span :class="label">{{ t('admin.fieldDiscordUrl') }}</span>
            <input v-model="form.discordUrl" type="url" placeholder="https://" :class="input">
          </label>
          <ToolImageFields
            v-model:logo="form.logoUrl"
            v-model:images="form.images"
            v-model:busy="uploading"
            class="border-t border-ink-100 pt-4"
            :upload-url="`/api/me/tools/${toolId}/images`"
            :name="form.name"
            logo-required
            compact
          />
        </div>

        <div class="min-w-0 space-y-4 rounded-xl border border-ink-100 p-4">
          <div>
            <h2 class="text-sm font-extrabold text-ink-900">{{ t('myTool.contentHeading') }}</h2>
            <p class="mt-0.5 text-xs text-ink-500">{{ t('myTool.contentHint') }}</p>
          </div>
          <label class="block">
            <span :class="label">{{ t('admin.fieldShortDesc') }} *</span>
            <input v-model="form.shortDesc" type="text" maxlength="300" :class="input">
          </label>
          <label class="block">
            <span :class="label">{{ t('admin.fieldDescription') }} *</span>
            <textarea v-model="form.description" rows="5" :class="input" />
          </label>
          <label class="block">
            <span :class="label">{{ t('admin.fieldWhatIs') }} *</span>
            <textarea v-model="form.whatIs" rows="4" :class="input" />
          </label>
          <label class="block">
            <span :class="label">{{ t('admin.fieldHowToUse') }} *</span>
            <textarea v-model="form.howToUse" rows="4" :class="input" />
          </label>
          <label class="block">
            <span :class="label">{{ t('admin.fieldCoreFeatures') }} *</span>
            <textarea v-model="form.coreFeatures" rows="4" :placeholder="t('admin.coreFeaturesPlaceholder')" :class="input" />
          </label>
          <label class="block">
            <span :class="label">{{ t('admin.fieldUseCases') }} *</span>
            <textarea v-model="form.useCases" rows="4" :placeholder="t('admin.useCasesPlaceholder')" :class="input" />
          </label>
        </div>

        <div class="flex flex-wrap items-center gap-3 lg:col-span-2">
          <button type="button" :disabled="!!saving || !!uploading" class="rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:border-brand-300 disabled:opacity-50" @click="save(false)">
            {{ saving === 'draft' ? t('myTool.saving') : t('myTool.saveDraft') }}
          </button>
          <button type="submit" :disabled="!!saving || !!uploading" class="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">
            {{ saving === 'submit' ? t('myTool.saving') : updating ? t('myTool.update.submit') : t('myTool.submitForReview') }}
          </button>
          <p v-if="message" :class="['text-sm', message.ok ? 'text-emerald-700' : 'text-red-600']">{{ message.text }}</p>
        </div>
      </form>
    </template>
  </div>
</template>
