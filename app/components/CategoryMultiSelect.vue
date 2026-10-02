<script setup lang="ts">
// Pick several categories: selected ones show as removable chips, the rest
// in a searchable checklist. Used by the admin ToolForm and the owner's tool page.
const props = withDefaults(defineProps<{
  options: { slug: string; name?: string | null }[]
  max?: number
  disabled?: boolean
}>(), { max: 5, disabled: false })

const selected = defineModel<string[]>({ required: true })

const { t } = useI18n()
const query = ref('')
const open = ref(false)

const label = (slug: string) => props.options.find(o => o.slug === slug)?.name || slug
const full = computed(() => selected.value.length >= props.max)
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return props.options.filter(o => !q || (o.name || o.slug).toLowerCase().includes(q) || o.slug.includes(q))
})

function toggle(slug: string) {
  if (selected.value.includes(slug)) selected.value = selected.value.filter(s => s !== slug)
  else if (!full.value) selected.value = [...selected.value, slug]
}
</script>

<template>
  <div>
    <div class="flex min-h-[38px] flex-wrap items-center gap-1.5 rounded-lg border border-ink-200 px-2 py-1.5" :class="{ 'bg-ink-100/40': disabled }">
      <span v-for="slug in selected" :key="slug" class="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
        {{ label(slug) }}
        <button v-if="!disabled" type="button" class="text-brand-400 hover:text-red-600" :aria-label="t('categoryPicker.remove')" @click="toggle(slug)">×</button>
      </span>
      <span v-if="!selected.length" class="px-1 text-sm text-ink-400">{{ t('admin.noCategory') }}</span>
      <button v-if="!disabled" type="button" class="ml-auto rounded px-2 py-0.5 text-xs font-semibold text-brand-600 hover:bg-brand-50" @click="open = !open">
        {{ open ? t('categoryPicker.done') : t('categoryPicker.choose') }}
      </button>
    </div>

    <div v-if="open && !disabled" class="mt-1.5 rounded-lg border border-ink-200 bg-white p-2 shadow-sm">
      <input v-model="query" type="search" :placeholder="t('categoryPicker.search')" class="mb-2 w-full rounded-md border border-ink-200 px-2 py-1.5 text-sm outline-none focus:border-brand-400">
      <p class="mb-1 px-1 text-xs text-ink-400">{{ t('categoryPicker.limit', { n: max }) }}</p>
      <div class="max-h-56 overflow-y-auto">
        <label
          v-for="o in filtered"
          :key="o.slug"
          :class="['flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-ink-100/50', { 'cursor-not-allowed opacity-40': full && !selected.includes(o.slug) }]"
        >
          <input type="checkbox" :checked="selected.includes(o.slug)" :disabled="full && !selected.includes(o.slug)" class="h-4 w-4 rounded border-ink-300 text-brand-500" @change="toggle(o.slug)">
          {{ o.name || o.slug }}
        </label>
        <p v-if="!filtered.length" class="px-1.5 py-1 text-sm text-ink-400">{{ t('categoryPicker.empty') }}</p>
      </div>
    </div>
  </div>
</template>
