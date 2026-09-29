<script setup lang="ts">
import type { Category, Tool } from '~/types'

const props = defineProps<{
  mode: 'create' | 'edit'
  toolId?: string
  initialTool: Tool | null
  categories: Category[]
}>()

const emit = defineEmits<{
  (e: 'saved', id: string): void
  (e: 'cancel'): void
}>()

const { t, locale, locales } = useI18n()
const { authHeaders } = useAuth()

const isEdit = computed(() => props.mode === 'edit')

const statusOptions = ['PENDING', 'PUBLISHED', 'CANCELED'] as const
const pricingOptions = ['FREE', 'FREEMIUM', 'PAID'] as const
const translationLocales = computed(() => locales.value.map(l => ({ code: l.code, name: l.name ?? l.code })))

const form = reactive({
  name: '',
  slug: '',
  website: '',
  logoUrl: '',
  pricingType: 'FREEMIUM' as (typeof pricingOptions)[number],
  status: 'PENDING' as (typeof statusOptions)[number],
  categorySlug: '',
  region: '',
  source: '',
  monthlyRevenue: 0,
  affiliateUrl: '',
  couponCode: '',
  twitterUrl: '',
  discordUrl: '',
  productHuntUrl: '',
  isApproved: false,
  isFeatured: false,
  isVerified: false,
  isJustLaunched: false,
  isFreeTool: false
})

function loadForm(src: Tool) {
  form.name = src.name ?? ''
  form.slug = src.slug ?? ''
  form.website = src.website ?? ''
  form.logoUrl = src.logoUrl ?? ''
  form.pricingType = src.pricingType ?? 'FREEMIUM'
  form.status = src.status ?? 'PENDING'
  form.categorySlug = src.categories?.[0]?.slug ?? ''
  form.region = src.region ?? ''
  form.source = src.source ?? ''
  form.monthlyRevenue = src.monthlyRevenue ?? 0
  form.affiliateUrl = src.affiliateUrl ?? ''
  form.couponCode = src.couponCode ?? ''
  form.twitterUrl = src.twitterUrl ?? ''
  form.discordUrl = src.discordUrl ?? ''
  form.productHuntUrl = src.productHuntUrl ?? ''
  form.isApproved = src.isApproved ?? false
  form.isFeatured = src.isFeatured ?? false
  form.isVerified = src.isVerified ?? false
  form.isJustLaunched = src.isJustLaunched ?? false
  form.isFreeTool = src.isFreeTool ?? false
}

if (props.initialTool) loadForm(props.initialTool)

interface TranslationDraft {
  shortDesc: string
  description: string
  whatIs: string
  howToUse: string
  coreFeatures: string
  useCases: string
}

const translationLocale = ref(translationLocales.value.some(l => l.code === locale.value) ? locale.value : 'en')
const translationForm = reactive<TranslationDraft>({
  shortDesc: '',
  description: '',
  whatIs: '',
  howToUse: '',
  coreFeatures: '',
  useCases: ''
})

// Edits made while switching between language tabs are kept here so nothing
// is lost until Save persists every touched locale to the server at once.
const translationDrafts = reactive<Record<string, TranslationDraft>>({})

function saveDraft(loc: string) {
  translationDrafts[loc] = { ...translationForm }
}

function loadTranslation(loc: string) {
  const draft = translationDrafts[loc]
  if (draft) {
    Object.assign(translationForm, draft)
    return
  }
  const entry = props.initialTool?.translations?.find(tr => tr.locale === loc)
  translationForm.shortDesc = entry?.shortDesc ?? ''
  translationForm.description = entry?.description ?? ''
  translationForm.whatIs = entry?.whatIs ?? ''
  translationForm.howToUse = entry?.howToUse ?? ''
  translationForm.coreFeatures = (entry?.coreFeatures ?? []).join('\n')
  translationForm.useCases = (entry?.useCases ?? []).join('\n')
}

loadTranslation(translationLocale.value)
watch(translationLocale, (newLoc, oldLoc) => {
  if (oldLoc) saveDraft(oldLoc)
  loadTranslation(newLoc)
})

const saving = ref(false)
const saveError = ref('')

function getEnglishDraft(): TranslationDraft | null {
  const draft = translationDrafts.en
  if (draft) return draft

  const entry = props.initialTool?.translations?.find(tr => tr.locale === 'en')
  if (!entry) return null
  return {
    shortDesc: entry.shortDesc ?? '',
    description: entry.description ?? '',
    whatIs: entry.whatIs ?? '',
    howToUse: entry.howToUse ?? '',
    coreFeatures: (entry.coreFeatures ?? []).join('\n'),
    useCases: (entry.useCases ?? []).join('\n')
  }
}

function draftHasContent(draft: TranslationDraft) {
  return Boolean(
    draft.shortDesc.trim() || draft.description.trim() || draft.whatIs.trim() ||
    draft.howToUse.trim() || draft.coreFeatures.trim() || draft.useCases.trim()
  )
}

function draftHasAllContent(draft: TranslationDraft) {
  return Boolean(
    draft.shortDesc.trim() && draft.description.trim() && draft.whatIs.trim() &&
    draft.howToUse.trim() && draft.coreFeatures.trim() && draft.useCases.trim()
  )
}

async function save() {
  saveError.value = ''
  // Flush the currently open language tab into the drafts map so it's
  // included below even if the admin never switched away from it.
  saveDraft(translationLocale.value)

  const enDraft = getEnglishDraft()
  if (!enDraft || !draftHasContent(enDraft)) {
    saveError.value = t('admin.enContentRequired')
    return
  }
  if (form.isApproved && !draftHasAllContent(enDraft)) {
    saveError.value = t('admin.enContentIncomplete')
    return
  }
  if (!isEdit.value && !form.slug.trim()) {
    saveError.value = t('admin.slugRequired')
    return
  }

  saving.value = true
  try {
    let id = props.toolId

    const toolBody: Record<string, unknown> = {
      name: form.name,
      website: form.website || null,
      logoUrl: form.logoUrl || null,
      pricingType: form.pricingType,
      status: form.status,
      categorySlug: form.categorySlug || undefined,
      region: form.region || null,
      source: form.source || null,
      monthlyRevenue: form.monthlyRevenue,
      affiliateUrl: form.affiliateUrl || null,
      couponCode: form.couponCode || null,
      twitterUrl: form.twitterUrl || null,
      discordUrl: form.discordUrl || null,
      productHuntUrl: form.productHuntUrl || null,
      isApproved: form.isApproved,
      isFeatured: form.isFeatured,
      isVerified: form.isVerified,
      isJustLaunched: form.isJustLaunched,
      isFreeTool: form.isFreeTool
    }

    if (isEdit.value) {
      // First-time approval stamps addedOn with the save moment; an already
      // approved tool keeps whatever addedOn it already has.
      if (form.isApproved && !props.initialTool?.addedOn) {
        toolBody.addedOn = new Date().toISOString()
      }
      await $fetch(`/api/admin/tools/${id}`, { method: 'PATCH', headers: authHeaders(), body: toolBody })
    } else {
      toolBody.slug = form.slug.trim()
      if (form.isApproved) toolBody.addedOn = new Date().toISOString()
      const created = await $fetch<Tool>('/api/admin/tools', { method: 'POST', headers: authHeaders(), body: toolBody })
      id = created.id
    }

    const translationRequests = Object.entries(translationDrafts).map(([loc, draft]) =>
      $fetch(`/api/admin/tools/${id}/translations`, {
        method: 'PUT',
        headers: authHeaders(),
        body: {
          locale: loc,
          shortDesc: draft.shortDesc || null,
          description: draft.description || null,
          whatIs: draft.whatIs || null,
          howToUse: draft.howToUse || null,
          coreFeatures: draft.coreFeatures.split('\n').map(s => s.trim()).filter(Boolean),
          useCases: draft.useCases.split('\n').map(s => s.trim()).filter(Boolean),
          isManualOverride: true
        }
      })
    )
    await Promise.all(translationRequests)

    emit('saved', id as string)
  } catch (err: any) {
    const status = err?.statusCode ?? err?.response?.status
    saveError.value = status === 409 ? t('admin.slugTaken') : t('admin.saveError')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="space-y-6" @submit.prevent="save">
    <label
      :class="[
        'flex cursor-pointer items-center justify-between gap-4 rounded-xl border-2 p-4 transition',
        form.isApproved ? 'border-emerald-300 bg-emerald-50' : 'border-brand-200 bg-brand-50'
      ]"
    >
      <input v-model="form.isApproved" type="checkbox" class="sr-only">
      <span>
        <span :class="['block text-base font-extrabold', form.isApproved ? 'text-emerald-700' : 'text-ink-900']">{{ t('admin.flagApproved') }}</span>
        <span class="mt-0.5 block text-xs text-ink-500">{{ t('admin.flagApprovedHint') }}</span>
      </span>
      <span :class="['relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors', form.isApproved ? 'bg-emerald-500' : 'bg-ink-300']">
        <span :class="['absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform', form.isApproved ? 'translate-x-5' : 'translate-x-0.5']"></span>
      </span>
    </label>

    <p v-if="isEdit" class="rounded-lg bg-ink-100/50 px-3 py-2 text-xs text-ink-500">{{ t('admin.editLockedHint') }}</p>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr_2fr]">
      <div class="min-w-0 space-y-4 rounded-xl border border-ink-100 p-4">
        <label class="block">
          <span class="mb-1 block text-xs font-semibold text-ink-600">{{ t('admin.fieldName') }}</span>
          <input v-model="form.name" type="text" required :disabled="isEdit" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400 disabled:border-ink-100 disabled:bg-ink-100/40 disabled:text-ink-400">
        </label>
        <label class="block">
          <span class="mb-1 block text-xs font-semibold text-ink-600">{{ t('admin.fieldSlug') }}</span>
          <input v-model="form.slug" type="text" :required="!isEdit" :disabled="isEdit" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400 disabled:border-ink-100 disabled:bg-ink-100/40 disabled:text-ink-400">
        </label>
        <label class="block">
          <span class="mb-1 block text-xs font-semibold text-ink-600">{{ t('admin.fieldWebsite') }}</span>
          <input v-model="form.website" type="text" :disabled="isEdit" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400 disabled:border-ink-100 disabled:bg-ink-100/40 disabled:text-ink-400">
        </label>
        <label class="block">
          <span class="mb-1 block text-xs font-semibold text-ink-600">{{ t('admin.fieldLogoUrl') }}</span>
          <input v-model="form.logoUrl" type="text" :disabled="isEdit" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400 disabled:border-ink-100 disabled:bg-ink-100/40 disabled:text-ink-400">
        </label>
        <label class="block">
          <span class="mb-1 block text-xs font-semibold text-ink-600">{{ t('admin.fieldPricingType') }}</span>
          <select v-model="form.pricingType" :disabled="isEdit" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400 disabled:border-ink-100 disabled:bg-ink-100/40 disabled:text-ink-400">
            <option v-for="p in pricingOptions" :key="p" :value="p">{{ p }}</option>
          </select>
        </label>
        <label class="block">
          <span class="mb-1 block text-xs font-semibold text-ink-600">{{ t('admin.fieldStatus') }}</span>
          <select v-model="form.status" :disabled="isEdit" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400 disabled:border-ink-100 disabled:bg-ink-100/40 disabled:text-ink-400">
            <option v-for="s in statusOptions" :key="s" :value="s">{{ s }}</option>
          </select>
        </label>
        <label class="block">
          <span class="mb-1 block text-xs font-semibold text-ink-600">{{ t('admin.fieldCategory') }}</span>
          <select v-model="form.categorySlug" :disabled="isEdit" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400 disabled:border-ink-100 disabled:bg-ink-100/40 disabled:text-ink-400">
            <option value="">{{ t('admin.noCategory') }}</option>
            <option v-for="c in categories" :key="c.slug" :value="c.slug">{{ c.name }}</option>
          </select>
        </label>
      </div>

      <div class="min-w-0 space-y-4 rounded-xl border border-ink-100 p-4">
        <label class="block">
          <span class="mb-1 block text-xs font-semibold text-ink-600">{{ t('admin.fieldRegion') }}</span>
          <input v-model="form.region" type="text" :disabled="isEdit" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400 disabled:border-ink-100 disabled:bg-ink-100/40 disabled:text-ink-400">
        </label>
        <label class="block">
          <span class="mb-1 block text-xs font-semibold text-ink-600">{{ t('admin.fieldSource') }}</span>
          <input v-model="form.source" type="text" :disabled="isEdit" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400 disabled:border-ink-100 disabled:bg-ink-100/40 disabled:text-ink-400">
        </label>
        <label class="block">
          <span class="mb-1 block text-xs font-semibold text-ink-600">{{ t('admin.fieldMonthlyRevenue') }}</span>
          <input v-model.number="form.monthlyRevenue" type="number" min="0" step="1" :disabled="isEdit" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400 disabled:border-ink-100 disabled:bg-ink-100/40 disabled:text-ink-400">
        </label>
        <label class="block">
          <span class="mb-1 block text-xs font-semibold text-ink-600">{{ t('admin.fieldAffiliateUrl') }}</span>
          <input v-model="form.affiliateUrl" type="text" :disabled="isEdit" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400 disabled:border-ink-100 disabled:bg-ink-100/40 disabled:text-ink-400">
        </label>
        <label class="block">
          <span class="mb-1 block text-xs font-semibold text-ink-600">{{ t('admin.fieldCouponCode') }}</span>
          <input v-model="form.couponCode" type="text" :disabled="isEdit" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400 disabled:border-ink-100 disabled:bg-ink-100/40 disabled:text-ink-400">
        </label>
        <label class="block">
          <span class="mb-1 block text-xs font-semibold text-ink-600">{{ t('admin.fieldTwitterUrl') }}</span>
          <input v-model="form.twitterUrl" type="text" :disabled="isEdit" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400 disabled:border-ink-100 disabled:bg-ink-100/40 disabled:text-ink-400">
        </label>
        <label class="block">
          <span class="mb-1 block text-xs font-semibold text-ink-600">{{ t('admin.fieldDiscordUrl') }}</span>
          <input v-model="form.discordUrl" type="text" :disabled="isEdit" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400 disabled:border-ink-100 disabled:bg-ink-100/40 disabled:text-ink-400">
        </label>
        <label class="block">
          <span class="mb-1 block text-xs font-semibold text-ink-600">{{ t('admin.fieldProductHuntUrl') }}</span>
          <input v-model="form.productHuntUrl" type="text" :disabled="isEdit" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400 disabled:border-ink-100 disabled:bg-ink-100/40 disabled:text-ink-400">
        </label>

        <div class="flex flex-col gap-2 border-t border-ink-100 pt-4">
          <label class="flex items-center gap-2 text-sm text-ink-700">
            <input v-model="form.isFeatured" type="checkbox" :disabled="isEdit" class="h-4 w-4 rounded border-ink-300 text-brand-500 focus:ring-brand-300 disabled:opacity-50">
            {{ t('admin.flagFeatured') }}
          </label>
          <label class="flex items-center gap-2 text-sm text-ink-700">
            <input v-model="form.isVerified" type="checkbox" :disabled="isEdit" class="h-4 w-4 rounded border-ink-300 text-brand-500 focus:ring-brand-300 disabled:opacity-50">
            {{ t('admin.flagVerified') }}
          </label>
          <label class="flex items-center gap-2 text-sm text-ink-700">
            <input v-model="form.isJustLaunched" type="checkbox" :disabled="isEdit" class="h-4 w-4 rounded border-ink-300 text-brand-500 focus:ring-brand-300 disabled:opacity-50">
            {{ t('admin.flagJustLaunched') }}
          </label>
          <label class="flex items-center gap-2 text-sm text-ink-700">
            <input v-model="form.isFreeTool" type="checkbox" :disabled="isEdit" class="h-4 w-4 rounded border-ink-300 text-brand-500 focus:ring-brand-300 disabled:opacity-50">
            {{ t('admin.flagFreeTool') }}
          </label>
        </div>
      </div>

      <div class="min-w-0 rounded-xl border border-ink-100 p-4">
        <h2 class="text-sm font-extrabold text-ink-900">{{ t('admin.translationHeading') }}</h2>
        <div class="mt-3 flex flex-wrap gap-1 border-b border-ink-200">
          <button
            v-for="loc in translationLocales"
            :key="loc.code"
            type="button"
            :class="[
              '-mb-px shrink-0 rounded-t-lg border px-3 py-2 text-xs font-semibold transition',
              translationLocale === loc.code
                ? 'border-brand-300 border-b-white bg-white text-brand-600'
                : 'border-transparent text-ink-500 hover:text-brand-600'
            ]"
            @click="translationLocale = loc.code"
          >
            {{ loc.name }}
          </button>
        </div>

        <div class="mt-4 grid grid-cols-1 gap-4">
          <label class="block">
            <span class="mb-1 block text-xs font-semibold text-ink-600">{{ t('admin.fieldShortDesc') }}</span>
            <input v-model="translationForm.shortDesc" type="text" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400">
          </label>
          <label class="block">
            <span class="mb-1 block text-xs font-semibold text-ink-600">{{ t('admin.fieldDescription') }}</span>
            <textarea v-model="translationForm.description" rows="5" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400"></textarea>
          </label>
          <label class="block">
            <span class="mb-1 block text-xs font-semibold text-ink-600">{{ t('admin.fieldWhatIs') }}</span>
            <textarea v-model="translationForm.whatIs" rows="4" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400"></textarea>
          </label>
          <label class="block">
            <span class="mb-1 block text-xs font-semibold text-ink-600">{{ t('admin.fieldHowToUse') }}</span>
            <textarea v-model="translationForm.howToUse" rows="4" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400"></textarea>
          </label>
          <label class="block">
            <span class="mb-1 block text-xs font-semibold text-ink-600">{{ t('admin.fieldCoreFeatures') }}</span>
            <textarea v-model="translationForm.coreFeatures" rows="4" :placeholder="t('admin.coreFeaturesPlaceholder')" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400"></textarea>
          </label>
          <label class="block">
            <span class="mb-1 block text-xs font-semibold text-ink-600">{{ t('admin.fieldUseCases') }}</span>
            <textarea v-model="translationForm.useCases" rows="4" :placeholder="t('admin.useCasesPlaceholder')" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400"></textarea>
          </label>
        </div>
      </div>
    </div>

    <p v-if="saveError" class="text-sm text-red-600">{{ saveError }}</p>

    <div class="flex items-center gap-3 border-t border-ink-100 pt-5">
      <button type="submit" :disabled="saving" class="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">
        {{ saving ? t('admin.saving') : t('admin.save') }}
      </button>
      <button type="button" class="rounded-lg border border-ink-200 px-5 py-2.5 text-sm font-semibold text-ink-700 hover:border-brand-300" @click="emit('cancel')">
        {{ t('admin.cancel') }}
      </button>
    </div>
  </form>
</template>
