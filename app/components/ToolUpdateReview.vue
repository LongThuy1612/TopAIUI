<script setup lang="ts">
import type { Tool } from '~/types'

// Admin review of a paid "Update AI": every proposed change next to the live value
// (only what actually differs), then Apply — or Reject, which refunds the order.
const props = defineProps<{ tool: Tool }>()
const emit = defineEmits<{ (e: 'done'): void }>()

const { t } = useI18n()
const { authHeaders } = useAuth()

const request = computed(() => props.tool.updateRequest!)
const live = computed(() => props.tool.translations?.find(tr => tr.locale === 'en'))
const liveImages = computed(() => (Array.isArray(props.tool.images) ? props.tool.images : [])
  .map(i => (typeof i === 'string' ? i : (i as { url?: string } | null)?.url))
  .filter((u): u is string => !!u))

type Row = { key: string; before: string; after: string; image?: boolean; images?: { before: string[]; after: string[] } }
const show = (v: unknown) => (Array.isArray(v) ? v.join('\n') : v == null || v === '' ? '—' : String(v))

const rows = computed<Row[]>(() => {
  const c = request.value.changes
  if (!c) return []
  const out: Row[] = []
  const add = (key: string, before: unknown, after: unknown, extra: Partial<Row> = {}) => {
    if (JSON.stringify(before ?? null) !== JSON.stringify(after ?? null)) out.push({ key, before: show(before), after: show(after), ...extra })
  }
  const f = c.fields ?? {}
  if ('name' in f) add('name', props.tool.name, f.name)
  if ('logoUrl' in f) add('logoUrl', props.tool.logoUrl, f.logoUrl, { image: true })
  if ('pricingType' in f) add('pricingType', props.tool.pricingType, f.pricingType)
  if ('twitterUrl' in f) add('twitterUrl', props.tool.twitterUrl, f.twitterUrl)
  if ('discordUrl' in f) add('discordUrl', props.tool.discordUrl, f.discordUrl)
  if ('images' in f && JSON.stringify(liveImages.value) !== JSON.stringify(f.images)) {
    out.push({ key: 'images', before: '', after: '', images: { before: liveImages.value, after: f.images ?? [] } })
  }
  if (c.categorySlugs) add('categories', (props.tool.categories ?? []).map(x => x.slug).sort(), [...c.categorySlugs].sort())
  if (c.content) {
    for (const k of ['shortDesc', 'description', 'whatIs', 'howToUse', 'coreFeatures', 'useCases'] as const) {
      add(k, live.value?.[k], c.content[k])
    }
  }
  return out
})

const reason = ref('')
const busy = ref(false)
const error = ref('')

async function act(action: 'apply' | 'reject') {
  error.value = ''
  busy.value = true
  try {
    await $fetch(`/api/admin/update-requests/${request.value.id}`, {
      method: 'POST',
      headers: authHeaders(),
      body: { action, reason: reason.value }
    })
    reason.value = ''
    emit('done')
  } catch (e: any) {
    error.value = e?.data?.message || t('admin.saveError')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section class="mt-5 rounded-xl border-2 border-amber-200 bg-amber-50/40 p-4">
    <h2 class="text-sm font-extrabold text-ink-900">{{ t('admin.update.title') }}</h2>
    <p class="mt-1 text-sm text-ink-600">{{ t(`admin.update.status.${request.status}`) }}</p>

    <div v-if="rows.length" class="mt-3 overflow-x-auto">
      <table class="w-full min-w-[640px] text-left text-sm">
        <thead class="text-xs uppercase tracking-wide text-ink-400">
          <tr>
            <th class="py-1 pr-3">{{ t('admin.update.field') }}</th>
            <th class="py-1 pr-3">{{ t('admin.update.current') }}</th>
            <th class="py-1">{{ t('admin.update.proposed') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-amber-100 align-top">
          <tr v-for="r in rows" :key="r.key">
            <td class="py-2 pr-3 font-semibold text-ink-700">{{ t(`admin.update.fields.${r.key}`) }}</td>
            <template v-if="r.images">
              <td class="py-2 pr-3"><div class="flex flex-wrap gap-1"><img v-for="u in r.images.before" :key="u" :src="u" alt="" class="h-10 rounded border border-ink-200"></div></td>
              <td class="py-2"><div class="flex flex-wrap gap-1"><img v-for="u in r.images.after" :key="u" :src="u" alt="" class="h-10 rounded border border-emerald-300"></div></td>
            </template>
            <template v-else-if="r.image">
              <td class="py-2 pr-3"><img v-if="r.before !== '—'" :src="r.before" alt="" class="h-10 w-10 rounded border border-ink-200 object-cover"><span v-else>—</span></td>
              <td class="py-2"><img v-if="r.after !== '—'" :src="r.after" alt="" class="h-10 w-10 rounded border border-emerald-300 object-cover"><span v-else>—</span></td>
            </template>
            <template v-else>
              <td class="whitespace-pre-line py-2 pr-3 text-ink-500 line-through decoration-red-300">{{ r.before }}</td>
              <td class="whitespace-pre-line py-2 text-ink-900">{{ r.after }}</td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-else class="mt-2 text-sm text-ink-500">{{ t('admin.update.noChanges') }}</p>

    <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
      <button
        v-if="request.status === 'SUBMITTED'"
        type="button"
        :disabled="busy"
        class="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        @click="act('apply')"
      >
        {{ t('admin.update.apply') }}
      </button>
      <textarea v-model="reason" rows="2" :placeholder="t('admin.update.reasonPlaceholder')" class="min-w-0 flex-1 rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400" />
      <button type="button" :disabled="busy || !reason.trim()" class="shrink-0 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50" @click="act('reject')">
        {{ t('admin.update.reject') }}
      </button>
    </div>
    <p class="mt-2 text-xs text-ink-500">{{ t('admin.update.hint') }}</p>
    <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>
  </section>
</template>
