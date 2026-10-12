<script setup lang="ts">
import type { Category, Tool } from '~/types'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const toolId = String(route.params.id)

definePageMeta({ layout: 'dashboard', middleware: ['auth', 'admin'] })
const { authHeaders } = useAuth()

const { data: tool, refresh } = await useFetch<Tool>(`/api/admin/tools/${toolId}`, {
  headers: () => authHeaders(),
  watch: false
})

// User-submitted tools: publish → public page live, reject → back to the owner with a reason.
const submittedImages = computed(() => (Array.isArray(tool.value?.images) ? tool.value.images : [])
  .map(i => (typeof i === 'string' ? i : (i as { url?: string } | null)?.url))
  .filter((u): u is string => !!u))
const rejectReason = ref('')
const moderating = ref(false)
const moderateError = ref('')

const aiStatusKey = computed(() => {
  const v = tool.value?.aiSync
  return v === 0 ? 'queued' : v === 1 ? 'done' : v === -1 ? 'failed' : v === 2 ? 'invalid' : 'none'
})

async function moderate(action: 'publish' | 'reject' | 'ai') {
  moderateError.value = ''
  moderating.value = true
  try {
    await $fetch(`/api/admin/tools/${toolId}/moderate`, {
      method: 'POST',
      headers: authHeaders(),
      body: { action, reason: rejectReason.value }
    })
    rejectReason.value = ''
    await refresh()
  } catch (e: any) {
    moderateError.value = e?.data?.message || t('admin.saveError')
  } finally {
    moderating.value = false
  }
}


const { data: categories } = await useFetch<Category[]>('/api/categories')

function goBack() {
  router.back()
}

useSeoMeta({ title: 'Tool Details — TopAICollection' })
</script>

<template>
  <div>
    <button type="button" class="flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-brand-600" @click="goBack">
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      {{ t('admin.backToList') }}
    </button>

    <div v-if="!tool" class="mt-10 text-sm text-ink-400">{{ t('admin.loadError') }}</div>

    <template v-else>
      <h1 class="mt-3 text-xl font-extrabold text-ink-900">{{ t('admin.toolDetailTitle') }}</h1>
      <p class="mt-1 text-sm text-ink-500">{{ tool.slug }}</p>

      <section v-if="tool.ownerId" class="mt-5 rounded-xl border-2 border-brand-200 bg-brand-50/50 p-4">
        <h2 class="text-sm font-extrabold text-ink-900">{{ t('admin.submission.title') }}</h2>
        <p v-if="tool.duplicateOf" class="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {{ t('admin.submission.duplicate') }}
          <NuxtLink :to="`/admin/tools/${tool.duplicateOf.id}`" class="font-semibold underline">{{ tool.duplicateOf.name }}</NuxtLink>
        </p>
        <dl class="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt class="text-ink-500">{{ t('admin.submission.owner') }}</dt>
          <dd class="text-ink-800">{{ tool.owner?.email ?? tool.ownerId }}</dd>
          <dt class="text-ink-500">{{ t('admin.submission.mode') }}</dt>
          <dd class="text-ink-800">{{ t(`admin.submission.modes.${tool.submitMode ?? 'manual'}`) }}</dd>
          <dt class="text-ink-500">{{ t('admin.fieldStatus') }}</dt>
          <dd class="font-semibold text-ink-800">
            {{ tool.status }}
            <span v-if="tool.status === 'PENDING' && !tool.step2" class="font-normal text-amber-700">· {{ t('admin.waitingUserContent') }}</span>
          </dd>
          <dt class="text-ink-500">{{ t('admin.submission.ai') }}</dt>
          <dd class="flex flex-wrap items-center gap-2 text-ink-800">
            {{ t(`admin.submission.aiStatus.${aiStatusKey}`) }}
            <button type="button" :disabled="moderating || tool.aiSync === 0" class="rounded border border-ink-200 bg-white px-2 py-0.5 text-xs font-semibold text-ink-700 hover:border-brand-300 disabled:opacity-50" @click="moderate('ai')">
              {{ t('admin.submission.aiRerun') }}
            </button>
          </dd>
          <template v-if="tool.rejectionReason">
            <dt class="text-ink-500">{{ t('admin.submission.reason') }}</dt>
            <dd class="whitespace-pre-line text-ink-800">{{ tool.rejectionReason }}</dd>
          </template>
        </dl>

        <div v-if="tool.logoUrl || submittedImages.length" class="mt-3 flex flex-wrap items-end gap-2">
          <a v-if="tool.logoUrl" :href="tool.logoUrl" target="_blank" rel="noopener" class="h-14 w-14 overflow-hidden rounded-lg border border-ink-200 bg-white">
            <img :src="tool.logoUrl" alt="logo" class="h-full w-full object-cover">
          </a>
          <a v-for="img in submittedImages" :key="img" :href="img" target="_blank" rel="noopener" class="h-14 overflow-hidden rounded-lg border border-ink-200 bg-white">
            <img :src="img" alt="" class="h-full w-auto object-cover">
          </a>
        </div>

        <div v-if="tool.status !== 'PUBLISHED'" class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
          <button type="button" :disabled="moderating" class="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50" @click="moderate('publish')">
            {{ t('admin.submission.publish') }}
          </button>
          <textarea v-model="rejectReason" rows="2" :placeholder="t('admin.submission.reasonPlaceholder')" class="min-w-0 flex-1 rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400" />
          <button type="button" :disabled="moderating || !rejectReason.trim()" class="shrink-0 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50" @click="moderate('reject')">
            {{ t('admin.submission.reject') }}
          </button>
        </div>
        <p v-if="tool.status !== 'PUBLISHED'" class="mt-2 text-xs text-ink-500">{{ t('admin.submission.publishHint') }}</p>
        <p v-if="moderateError" class="mt-2 text-sm text-red-600">{{ moderateError }}</p>
      </section>

      <ToolUpdateReview v-if="tool.updateRequest" :tool="tool" @done="refresh()" />

      <!-- Not re-mounted after publish / reject / AI re-run: ToolForm only sends fields the
           admin changed, so it can't write a stale status back — and unsaved edits survive. -->
      <ToolForm
        class="mt-6"
        mode="edit"
        :tool-id="toolId"
        :initial-tool="tool"
        :categories="categories ?? []"
        @saved="goBack"
        @cancel="goBack"
      />
    </template>
  </div>
</template>
