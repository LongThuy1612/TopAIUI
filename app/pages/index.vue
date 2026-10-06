<script setup lang="ts">
import type { Category, ToolsResponse } from '~/types'

const { t, locale } = useI18n()

const [{ data: newRes }, { data: todayRes }, { data: categories }, { data: topRatedRes }] = await Promise.all([
  useFetch<ToolsResponse>('/api/tools', { query: computed(() => ({ limit: 5, newToday: 'true', locale: locale.value })) }),
  useFetch<ToolsResponse>('/api/tools', { query: computed(() => ({ limit: 15, today: 'true', locale: locale.value })) }),
  useFetch<Category[]>('/api/categories', { query: computed(() => ({ locale: locale.value })) }),
  useFetch<ToolsResponse>('/api/tools', { query: computed(() => ({ minRating: 4, sort: 'rating', limit: 100, locale: locale.value })) })
])

const newTools = computed(() => newRes.value?.items ?? [])
const todayTools = computed(() => todayRes.value?.items ?? [])
const allCategories = computed(() => categories.value ?? [])

const browseCategories = computed(() =>
  [...allCategories.value].sort((a, b) => b.count - a.count).slice(0, 15)
)
// First 5 tools of the /new page (same query and order).
const justLaunched = computed(() => newTools.value.slice(0, 5))
const featuredHighlights = computed(() => topRatedRes.value?.items ?? [])

const tabTools = computed(() => todayTools.value.slice(0, 15))

function initialsOf(name: string) {
  return name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'AI'
}

const categoryPalette = [
  { tile: '#FDF2F8', accent: '#BE185D' },
  { tile: '#FFF1F2', accent: '#E11D48' },
  { tile: '#FDF4FF', accent: '#A21CAF' },
  { tile: '#FFF7ED', accent: '#C2410C' },
  { tile: '#F5F3FF', accent: '#6D28D9' },
  { tile: '#ECFDF5', accent: '#065F46' },
  { tile: '#EFF6FF', accent: '#1D4ED8' }
]
function categoryStyle(i: number) {
  return categoryPalette[i % categoryPalette.length]!
}

useSeoMeta({
  title: 'TopAICollection — Discover the Best AI Tools',
  description: 'Explore hundreds of AI tools by category — find the right AI for coding, writing, design, video and more.'
})
</script>

<template>
  <div>
    <AppHero />

    <section id="feed" class="after-dot-grid w-full border-b border-ink-200 px-4 pt-8 pb-11 sm:px-6 lg:px-8">
      <div class="mx-auto grid max-w-[1440px] grid-cols-1 gap-5 lg:grid-cols-[260px_1fr_380px] lg:items-start">

        <aside class="flex min-w-0 flex-col gap-3 lg:order-1">
          <SidebarToolItem v-for="tool in justLaunched" :key="tool.slug" :tool="tool" />
          <div v-if="!justLaunched.length" class="rounded-xl border border-dashed border-ink-200 p-4 text-center text-xs text-ink-400">
            {{ t('empty.noTools') }}
          </div>
          <NuxtLink to="/new" class="text-sm font-bold text-brand-500 hover:text-brand-600">{{ t('sections.viewAll') }}</NuxtLink>
        </aside>

        <div class="min-w-0 rounded-[18px] border border-ink-200 bg-white pt-[22px] pr-[26px] pb-[26px] pl-[26px] lg:order-2">
          <div class="flex flex-wrap gap-1.5 border-b border-ink-100 pb-[18px]">
            <button
              type="button"
              class="cursor-pointer rounded-full bg-brand-50 px-[15px] py-[7px] text-[13.5px] font-semibold text-brand-600 transition-colors"
            >
              {{ t('tabs.newest') }}
            </button>
            <NuxtLink
              to="/new"
              class="rounded-full px-[15px] py-[7px] text-[13.5px] font-semibold text-ink-800 transition-colors hover:bg-ink-100"
            >
              {{ t('tabs.featured') }}
            </NuxtLink>
            <NuxtLink
              to="/most-featured"
              class="rounded-full px-[15px] py-[7px] text-[13.5px] font-semibold text-ink-800 transition-colors hover:bg-ink-100"
            >
              {{ t('tabs.free') }}
            </NuxtLink>
          </div>

          <div v-if="tabTools.length" class="flex flex-col divide-y divide-ink-100">
            <ToolListRow
              v-for="tool in tabTools"
              :key="tool.slug"
              :tool="tool"
              :category-label="tool.categories?.[0]?.name"
              hover-glow
            />
          </div>
          <div v-else class="mt-10 rounded-xl border border-dashed border-ink-200 py-16 text-center text-sm text-ink-400">
            {{ t('empty.noTools') }}
          </div>

          <div class="flex justify-center pt-[22px]">
            <NuxtLink to="/today" class="text-[14.5px] font-bold text-brand-500 hover:text-brand-600">
              {{ t('sections.viewMoreTools') }}
            </NuxtLink>
          </div>
        </div>

        <aside class="flex min-w-0 flex-col gap-[18px] lg:order-3">
          <AiNewsWidget />
        </aside>
      </div>
    </section>

    <section id="categories" class="w-full bg-white px-4 py-[72px] sm:px-6 lg:px-8">
      <div class="mx-auto max-w-[1440px]">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <h2 class="text-[clamp(26px,3.2vw,36px)] font-extrabold tracking-[-0.03em] text-ink-900">{{ t('sections.browseByCategory') }}</h2>
          <NuxtLink to="/category/all" class="text-[14.5px] font-bold text-brand-500 hover:text-brand-600">{{ t('sections.viewAll') }}</NuxtLink>
        </div>
        <div class="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3.5 pt-8">
          <NuxtLink
            v-for="(cat, i) in browseCategories"
            :key="cat.slug"
            :to="`/category/${cat.slug}`"
            class="flex items-start gap-3.5 rounded-[14px] border border-ink-200 p-5 transition-colors hover:border-brand-200 hover:bg-brand-50"
          >
            <span
              class="inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] text-[15px]"
              :style="{ background: categoryStyle(i).tile, color: categoryStyle(i).accent }"
            >
              <CategoryIcon :icon="cat.icon" />
            </span>
            <span>
              <span class="block text-base font-bold tracking-[-.01em] text-ink-900">{{ cat.name }}</span>
              <span class="block pt-1.5 text-[13.5px] text-ink-600">{{ cat.count }}</span>
            </span>
          </NuxtLink>
        </div>
      </div>
    </section>

    <section id="featured" class="w-full border-t border-ink-200 bg-ink-100/40 px-4 py-[72px] sm:px-6 lg:px-8">
      <div class="mx-auto max-w-[1440px]">
        <h2 class="mb-1.5 text-[clamp(26px,3.2vw,36px)] font-extrabold tracking-[-0.03em] text-ink-900">{{ t('sections.featuredThisWeek') }}</h2>
        <p class="text-base text-ink-600">{{ t('sections.featuredThisWeekSubtitle') }}</p>
        <div v-if="featuredHighlights.length" class="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4 pt-[30px]">
          <NuxtLink
            v-for="tool in featuredHighlights"
            :key="tool.slug"
            :to="`/tools/${tool.slug}`"
            class="relative flex flex-col gap-3 overflow-hidden rounded-[18px] border border-brand-100 bg-white p-5 shadow-[0_2px_6px_rgba(23,18,26,.04)] transition-shadow hover:shadow-[0_16px_32px_-20px_rgba(23,18,26,.45)]"
          >
            <img
              v-if="tool.logoUrl"
              :src="tool.logoUrl"
              :alt="tool.name"
              class="pointer-events-none absolute -top-3 -right-4 h-28 w-28 rounded-full object-cover opacity-[0.16]"
            >
            <template v-else>
              <span class="pointer-events-none absolute -top-[18px] -right-[22px] h-32 w-32 rounded-full bg-brand-500 opacity-[0.06]"></span>
              <span class="pointer-events-none absolute top-2 right-0.5 text-[46px] font-extrabold tracking-[.02em] text-brand-500 opacity-[0.12]">{{ initialsOf(tool.name) }}</span>
            </template>
            <div class="relative flex items-start gap-[11px]">
              <div v-if="tool.logoUrl" class="h-9 w-9 shrink-0 overflow-hidden rounded-full">
                <img :src="tool.logoUrl" :alt="tool.name" class="h-full w-full object-cover">
              </div>
              <span v-else class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500 text-[12.5px] font-extrabold text-white">{{ initialsOf(tool.name) }}</span>
              <span class="line-clamp-2 min-w-0 text-[17px] font-extrabold tracking-[-.02em] text-ink-900">{{ tool.name }}</span>
            </div>
            <p v-if="tool.shortDesc" class="relative line-clamp-2 text-sm leading-[1.6] text-[#7A5566]">{{ tool.shortDesc }}</p>
            <p v-else-if="tool.categories?.length" class="relative line-clamp-2 text-sm leading-[1.6] text-[#7A5566]">{{ tool.categories.map(c => c.name).join(', ') }}</p>
          </NuxtLink>
        </div>
        <div v-else class="mt-10 rounded-xl border border-dashed border-ink-200 py-16 text-center text-sm text-ink-400">
          {{ t('empty.noTools') }}
        </div>
      </div>
    </section>
  </div>
</template>
