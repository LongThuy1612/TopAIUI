<script setup lang="ts">
// /categories: every group with its categories as a grid of links with tool counts
// (two levels from the categories' own parents, server/api/categories/tree.get.ts), and
// "Other" for the categories without a group. The side list jumps to a group and follows
// the scroll; the box filters the categories by name, accents ignored.
import type { CategoryGroup, CategoryNode } from '~/components/CategoryNav.vue'

const { t, locale } = useI18n()
const nf = computed(() => new Intl.NumberFormat(locale.value))

const { data: tree } = await useFetch<{ groups: CategoryGroup[]; ungrouped: CategoryNode[]; ungroupedCount: number; totalTools: number }>('/api/categories/tree', {
  key: computed(() => `category-tree:${locale.value}`),
  query: computed(() => ({ locale: locale.value }))
})

interface Section { key: string; slug: string | null; name: string; count: number; children: CategoryNode[] }
const OTHER = '_other' // slugs have no underscore: never a group's key or anchor
const sections = computed<Section[]>(() => {
  const list: Section[] = (tree.value?.groups ?? []).map(g => ({ key: g.slug, slug: g.slug, name: g.name, count: g.count, children: g.children }))
  if (tree.value?.ungrouped.length) {
    list.push({ key: OTHER, slug: null, name: t('category.other'), count: tree.value.ungroupedCount, children: tree.value.ungrouped })
  }
  return list
})
const categoryCount = computed(() => sections.value.reduce((n, s) => n + s.children.length, 0))

// Filter: accents don't count ("giong noi" finds "Giọng nói").
const filter = ref('')
const fold = foldText
const q = computed(() => fold(filter.value.trim()))
const shown = computed(() => {
  if (!q.value) return sections.value
  return sections.value.flatMap((s) => {
    const children = fold(s.name).includes(q.value) ? s.children : s.children.filter(c => fold(c.name).includes(q.value) || c.slug.includes(q.value))
    return children.length ? [{ ...s, children }] : []
  })
})

// The side list follows the section at the top of the screen.
const active = ref('')
watch(shown, list => { if (!list.some(s => s.key === active.value)) active.value = list[0]?.key ?? '' }, { immediate: true })
const anchor = (key: string) => `g-${key}`
let spy: IntersectionObserver | null = null
let jumping = 0
function observeSections() {
  spy?.disconnect()
  if (typeof IntersectionObserver === 'undefined') return
  spy = new IntersectionObserver((entries) => {
    if (Date.now() < jumping) return
    const top = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
    if (top) active.value = (top.target as HTMLElement).dataset.key ?? active.value
  }, { rootMargin: '-96px 0px -65% 0px' })
  document.querySelectorAll<HTMLElement>('[data-category-section]').forEach(el => spy!.observe(el))
}
function jump(key: string) {
  active.value = key
  jumping = Date.now() + 800 // the smooth scroll passes other sections
  document.getElementById(anchor(key))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
onMounted(observeSections)
watch(shown, () => nextTick(observeSections))
onBeforeUnmount(() => spy?.disconnect())

// A sponsored tool under each group, each a different one (fewer campaigns than groups:
// the first groups get them).
const { slots: adSlots } = useAdSlots('categories', { positions: [], limit: Math.max(1, sections.value.length), rerender: () => shown.value.length })

const title = computed(() => t('categoriesPage.title'))
useSeoMeta({
  title: () => `${title.value} — TopAICollection`,
  description: () => t('categoriesPage.subtitle', { tools: nf.value.format(tree.value?.totalTools ?? 0), groups: sections.value.length, categories: categoryCount.value }),
  ogTitle: () => `${title.value} — TopAICollection`
})
useBreadcrumbLd(() => [[t('categoriesPage.breadcrumb'), '/categories']])
</script>

<template>
  <div class="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
    <nav class="flex items-center gap-1.5 text-sm text-ink-500">
      <NuxtLinkLocale to="/" class="text-ink-900 hover:text-brand-600">{{ t('category.breadcrumbHome') }}</NuxtLinkLocale>
      <span aria-hidden="true">›</span>
      <span>{{ t('categoriesPage.breadcrumb') }}</span>
    </nav>

    <div class="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 class="text-[32px] font-extrabold leading-tight tracking-[-.02em] text-ink-900 sm:text-[40px]">{{ title }}</h1>
        <p class="mt-1.5 text-[15px] text-ink-500">
          {{ t('categoriesPage.subtitle', { tools: nf.format(tree?.totalTools ?? 0), groups: nf.format(sections.length), categories: nf.format(categoryCount) }) }}
        </p>
      </div>
      <label class="relative block w-full md:w-[340px]">
        <svg class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
        </svg>
        <input
          v-model="filter"
          type="search"
          :placeholder="t('categoriesPage.filterPlaceholder')"
          :aria-label="t('categoriesPage.filterPlaceholder')"
          class="w-full rounded-xl border border-ink-200 bg-white py-3 pl-10 pr-3 text-sm outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
        >
      </label>
    </div>

    <!-- Phones: the groups as a sliding row. -->
    <div class="sticky top-[64px] z-10 -mx-4 mt-5 overflow-x-auto border-b border-ink-100 bg-white px-4 py-2.5 [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden">
      <div class="flex w-max gap-2">
        <button
          v-for="s in shown"
          :key="s.key"
          type="button"
          :class="['whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm transition-colors', active === s.key ? 'border-brand-500 bg-brand-50 font-semibold text-brand-700' : 'border-ink-200 text-ink-700']"
          @click="jump(s.key)"
        >
          {{ s.name }}
        </button>
      </div>
    </div>

    <div class="mt-6 grid grid-cols-1 gap-8 lg:mt-8 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside class="hidden border-r border-ink-100 pr-4 lg:block">
        <nav class="sticky top-[88px] max-h-[calc(100vh-112px)] space-y-0.5 overflow-y-auto overscroll-contain" :aria-label="t('categoriesPage.groups')">
          <a
            v-for="s in shown"
            :key="s.key"
            :href="`#${anchor(s.key)}`"
            :class="['block rounded-lg px-3 py-2 text-[15px] leading-snug transition-colors', active === s.key ? 'bg-brand-50 font-semibold text-brand-700' : 'text-ink-700 hover:bg-ink-100/60 hover:text-ink-900']"
            @click.prevent="jump(s.key)"
          >
            {{ s.name }}
          </a>
        </nav>
      </aside>

      <div class="min-w-0 space-y-12">
        <template v-for="(s, i) in shown" :key="s.key">
          <section :id="anchor(s.key)" data-category-section :data-key="s.key" class="scroll-mt-[136px] lg:scroll-mt-[88px]">
            <h2 class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <NuxtLinkLocale v-if="s.slug" :to="`/category/${s.slug}`" class="text-2xl font-bold tracking-[-.01em] text-ink-900 hover:text-brand-600">{{ s.name }}</NuxtLinkLocale>
              <span v-else class="text-2xl font-bold tracking-[-.01em] text-ink-900">{{ s.name }}</span>
              <span class="text-sm font-normal text-ink-400">{{ t('categoriesPage.categoriesCount', { n: nf.format(s.children.length) }, s.children.length) }} · {{ t('categoriesPage.toolsCount', { n: nf.format(s.count) }, s.count) }}</span>
            </h2>
            <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <NuxtLinkLocale
                v-for="c in s.children"
                :key="c.slug"
                :to="`/category/${c.slug}`"
                class="flex items-center justify-between gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3 transition hover:border-brand-300 hover:shadow-[0_6px_16px_-10px_rgba(228,89,55,.45)]"
              >
                <span class="truncate text-[15px] text-ink-900">{{ c.name }}</span>
                <span class="shrink-0 text-[15px] font-medium text-brand-600">{{ nf.format(c.count) }}</span>
              </NuxtLinkLocale>
            </div>
          </section>
          <AdBanner v-if="adSlots[i]" :ad="adSlots[i]!" placement="categories" />
        </template>

        <p v-if="!shown.length" class="rounded-xl border border-dashed border-ink-200 py-16 text-center text-sm text-ink-400">{{ t('categoriesPage.empty') }}</p>
      </div>
    </div>
  </div>
</template>
