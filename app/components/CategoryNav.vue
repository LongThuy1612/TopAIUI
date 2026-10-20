<script setup lang="ts">
// The category page's browser (sidebar on desktop, a sheet on phones): each group with its
// categories, folded, then "Other" with the categories that have no group (not a category
// itself: its row only folds). The group holding the open category starts unfolded;
// typing in the box filters everything and unfolds what matches.
export interface CategoryNode { slug: string; name: string; icon: string; count: number }
export interface CategoryGroup extends CategoryNode { children: CategoryNode[] }

const props = defineProps<{ groups: CategoryGroup[]; ungrouped: CategoryNode[]; ungroupedCount: number; active: string }>()
const emit = defineEmits<{ navigate: [] }>()
const { t, locale } = useI18n()
const nf = computed(() => new Intl.NumberFormat(locale.value))

const OTHER = ' other' // no slug has a space
const query = ref('')
// Accents don't count: "thiet ke" finds "Thiết kế", "categoria" finds "Categoría".
const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()
const q = computed(() => fold(query.value.trim()))
const matches = (n: CategoryNode) => fold(n.name).includes(q.value) || n.slug.includes(q.value)

// Open folds: the active category's group (or "Other"), then whatever the visitor opens.
const groupOfActive = computed(() => {
  if (props.ungrouped.some(n => n.slug === props.active)) return OTHER
  return props.groups.find(g => g.slug === props.active || g.children.some(c => c.slug === props.active))?.slug ?? null
})
const opened = ref(new Set<string>(groupOfActive.value ? [groupOfActive.value] : []))
watch(groupOfActive, (g) => { if (g) opened.value = new Set([...opened.value, g]) })
function toggle(slug: string) {
  const next = new Set(opened.value)
  if (next.has(slug)) next.delete(slug)
  else next.add(slug)
  opened.value = next
}

// While searching: a group stays if it or one of its categories matches; a matching group
// shows all its categories, otherwise only the matching ones.
const shownGroups = computed(() => {
  if (!q.value) return props.groups.map(g => ({ ...g, list: g.children, open: opened.value.has(g.slug) }))
  return props.groups.flatMap((g) => {
    const list = matches(g) ? g.children : g.children.filter(matches)
    return matches(g) || list.length ? [{ ...g, list, open: list.length > 0 }] : []
  })
})
const shownUngrouped = computed(() => (q.value ? props.ungrouped.filter(matches) : props.ungrouped))
const otherOpen = computed(() => (q.value ? shownUngrouped.value.length > 0 : opened.value.has(OTHER)))
const nothing = computed(() => !!q.value && !shownGroups.value.length && !shownUngrouped.value.length)

const rowClass = (on: boolean) => [
  'flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
  on ? 'bg-brand-50 font-semibold text-brand-700' : 'text-ink-800 hover:bg-ink-100/60 hover:text-ink-900'
]
const childClass = (on: boolean) => [
  'flex items-center justify-between gap-2 rounded-md py-1.5 pl-3 pr-2.5 text-[13px] transition-colors',
  on ? 'bg-brand-50 font-semibold text-brand-700' : 'text-ink-600 hover:bg-ink-100/60 hover:text-ink-900'
]
</script>

<template>
  <div class="flex min-h-0 flex-col">
    <label class="relative block">
      <svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
      </svg>
      <input
        v-model="query"
        type="search"
        :placeholder="t('category.searchCategories')"
        :aria-label="t('category.searchCategories')"
        class="w-full rounded-xl border border-ink-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
      >
    </label>

    <nav class="mt-3 min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain pr-1" :aria-label="t('category.browse')">
      <!-- Groups -->
      <div v-for="g in shownGroups" :key="g.slug">
        <div class="flex items-center gap-1">
          <NuxtLinkLocale :to="`/category/${g.slug}`" :class="rowClass(g.slug === active)" @click="emit('navigate')">
            <span class="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-50 text-sm text-brand-600" aria-hidden="true"><CategoryIcon :icon="g.icon" /></span>
            <span class="min-w-0 flex-1 truncate">{{ g.name }}</span>
            <span class="shrink-0 text-xs font-normal text-ink-400">{{ nf.format(g.count) }}</span>
          </NuxtLinkLocale>
          <button
            v-if="g.children.length"
            type="button"
            :aria-expanded="g.open"
            :aria-label="t('category.expandGroup', { name: g.name })"
            class="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-400 hover:bg-ink-100/60 hover:text-ink-700"
            @click="toggle(g.slug)"
          >
            <svg :class="['h-4 w-4 transition-transform', g.open && 'rotate-90']" fill="none" viewBox="0 0 20 20" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m7.5 5 5 5-5 5" /></svg>
          </button>
        </div>
        <div v-if="g.open && g.list.length" class="mb-1 ml-[22px] space-y-0.5 border-l border-ink-100 pl-2">
          <NuxtLinkLocale v-for="c in g.list" :key="c.slug" :to="`/category/${c.slug}`" :class="childClass(c.slug === active)" @click="emit('navigate')">
            <span class="truncate">{{ c.name }}</span>
            <span class="shrink-0 text-xs text-ink-400">{{ nf.format(c.count) }}</span>
          </NuxtLinkLocale>
        </div>
      </div>

      <!-- Other: the categories that belong to no group -->
      <div v-if="shownUngrouped.length">
        <!-- Laid out like a group's row (name, count, then the arrow), but the whole row folds. -->
        <button type="button" :aria-expanded="otherOpen" class="flex w-full items-center gap-1 text-left" @click="toggle(OTHER)">
          <span :class="rowClass(false)">
            <span class="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-ink-100 text-sm" aria-hidden="true">🧩</span>
            <span class="min-w-0 flex-1 truncate">{{ t('category.other') }}</span>
            <span class="shrink-0 text-xs font-normal text-ink-400">{{ nf.format(ungroupedCount) }}</span>
          </span>
          <span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-400" aria-hidden="true">
            <svg :class="['h-4 w-4 transition-transform', otherOpen && 'rotate-90']" fill="none" viewBox="0 0 20 20" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m7.5 5 5 5-5 5" /></svg>
          </span>
        </button>
        <div v-if="otherOpen" class="mb-1 ml-[22px] space-y-0.5 border-l border-ink-100 pl-2">
          <NuxtLinkLocale v-for="c in shownUngrouped" :key="c.slug" :to="`/category/${c.slug}`" :class="childClass(c.slug === active)" @click="emit('navigate')">
            <span class="truncate">{{ c.name }}</span>
            <span class="shrink-0 text-xs text-ink-400">{{ nf.format(c.count) }}</span>
          </NuxtLinkLocale>
        </div>
      </div>

      <p v-if="nothing" class="px-2.5 py-6 text-center text-sm text-ink-400">{{ t('category.noCategoryMatch') }}</p>
    </nav>
  </div>
</template>
