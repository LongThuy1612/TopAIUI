<script setup lang="ts">
import type { ArticlesResponse, ToolsResponse } from '~/types'
import { advertise } from '~/data/promote'
import { SUPPORT_EMAIL, SOCIAL_LINKS } from '#shared/site'

const { t, locale } = useI18n()

type Tool = ToolsResponse['items'][number]
type Trending = { period: 'week' | 'month' | 'all'; items: { slug: string; name: string; count: number }[] }
const [{ data: hotRes }, { data: todayRes }, { data: categories }, { data: topRatedRes }, { data: trendingRes }] = await Promise.all([
  // Trending tools (server/utils/toolStats.ts): 10, not 5 — tools in an ad slot of the
  // feed are left out of it.
  useFetch<{ items: Tool[] }>('/api/hot-tools', { query: computed(() => ({ locale: locale.value })) }),
  useFetch<ToolsResponse>('/api/tools', { query: computed(() => ({ limit: 15, today: 'true', locale: locale.value })) }),
  useCategories(),
  useFetch<ToolsResponse>('/api/tools', { query: computed(() => ({ minRating: 4, sort: 'rating', limit: 30, locale: locale.value })) }),
  useFetch<Trending>('/api/categories/trending', { query: computed(() => ({ locale: locale.value })) })
])

/* ---- Top AI launches ---------------------------------------------------- */

// Today: the newest launches, ranked by upvotes (ties keep the newest first). New and
// Most Featured are the /new and /most-featured lists, loaded when their tab is opened.
type Tab = 'today' | 'new' | 'featured'
const tab = ref<Tab>('today')
const tabs: { key: Tab; label: string }[] = [
  { key: 'today', label: 'tabs.newest' },
  { key: 'new', label: 'tabs.featured' },
  { key: 'featured', label: 'tabs.free' }
]
const otherTabs = reactive<Record<'new' | 'featured', Tool[] | null>>({ new: null, featured: null })
async function openTab(next: Tab) {
  tab.value = next
  if (next === 'today' || otherTabs[next]) return
  const query = next === 'new' ? { newToday: 'true', limit: 10, locale: locale.value } : { sort: 'rating', limit: 10, locale: locale.value }
  const res = await $fetch<ToolsResponse>('/api/tools', { query }).catch(() => null)
  otherTabs[next] = res?.items ?? []
}
watch(locale, () => { otherTabs.new = otherTabs.featured = null; tab.value = 'today' })

const { countOf, isVoted, toggle, loadVoted, busy } = useUpvotes()
const todayRanked = computed(() => [...(todayRes.value?.items ?? [])]
  .map((tool, i) => ({ tool, i }))
  // The listed counts, not this viewer's fresh ones: a vote must not move the row away
  // from under the cursor.
  .sort((a, b) => ((b.tool.upvoteCount ?? 0) - (a.tool.upvoteCount ?? 0)) || (a.i - b.i))
  .map(({ tool }) => tool))

// Sponsored tools only go into the Today feed (positions 1, 4, 12); a tool in an ad slot
// isn't repeated in the organic lists.
const { feed } = useAdSlots('home', { limit: advertise.slotPositions.length })
const rows = computed(() => {
  if (tab.value === 'today') return feed(todayRanked.value).slice(0, 10)
  return (otherTabs[tab.value] ?? []).slice(0, 10).map(tool => ({ key: tool.slug, tool, ad: undefined }))
})
const advertisedSlugs = computed(() => new Set(feed(todayRanked.value).flatMap(item => (item.ad ? [item.ad.tool.slug] : []))))
// Once mounted (the token lives in browser storage), and again when the list changes.
onMounted(() => {
  watch(rows, list => loadVoted(list.flatMap(r => (r.ad ? [] : [r.tool.slug]))), { immediate: true })
})

// The launch day the list starts with ("Thursday, Oct 15") and how many tools it had.
const launchDay = computed(() => {
  const added = todayRes.value?.items?.[0]?.addedOn
  return added ? added.slice(0, 10) : new Date().toISOString().slice(0, 10)
})
const launchDayLabel = computed(() => new Date(`${launchDay.value}T12:00:00Z`)
  .toLocaleDateString(locale.value, { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' }))
const { data: dayRes } = await useFetch<ToolsResponse>('/api/tools', { query: computed(() => ({ addedDate: launchDay.value, limit: 1, locale: locale.value })) })
const launchCount = computed(() => dayRes.value?.total ?? 0)
const tabLink: Record<Tab, string> = { today: '/today', new: '/new', featured: '/most-featured' }
const reviewsLabel = (tool: Tool) => t('home.reviews', { n: nf.value.format(tool.reviewCount ?? 0) }, tool.reviewCount ?? 0)

/* ---- Sidebar --------------------------------------------------------------- */

const trendingCategories = computed(() => trendingRes.value?.items ?? [])
// AI News: with articles it sits above Trending categories and Trending tools steps aside;
// without any, the sidebar shows Trending categories and Trending tools.
const { data: newsRes } = await useFetch<ArticlesResponse>('/api/articles', { query: { limit: 10 }, key: 'ai-news-widget' })
const news = computed(() => newsRes.value?.items ?? [])
const trendingTitle = computed(() => t({ week: 'sidebar.trendingThisWeek', month: 'sidebar.trendingThisMonth', all: 'sidebar.topCategories' }[trendingRes.value?.period ?? 'all']))
// The 5 most viewed / visited / saved tools of the last 7 days, less the advertised ones.
const trendingTools = computed(() =>
  (hotRes.value?.items ?? []).filter(tool => !advertisedSlugs.value.has(tool.slug)).slice(0, 5))

/* ---- Browse by category / Featured ----------------------------------------- */

const browseCategories = computed(() =>
  [...(categories.value ?? [])].sort((a, b) => b.count - a.count).slice(0, 15))
const featuredTools = computed(() => topRatedRes.value?.items ?? [])

const nf = computed(() => new Intl.NumberFormat(locale.value))
function initialsOf(name: string) {
  return name.replace(/[^A-Za-z0-9 ]/g, '').split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'AI'
}
// A soft tint and a deep ink of one hue per name, so a tool keeps its colours everywhere.
function hueOf(name: string) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360
  return h
}
const tintOf = (name: string) => ({ background: `oklch(0.95 0.035 ${hueOf(name)})`, color: `oklch(0.45 0.13 ${hueOf(name)})` })
const CATEGORY_HUES = [20, 60, 120, 160, 200, 250, 290, 330]
const categoryTint = (i: number) => ({ background: `oklch(0.94 0.04 ${CATEGORY_HUES[i % CATEGORY_HUES.length]})` })

// Lengths search engines show in full: title 50–60 characters, description 120–160.
const SEO_TITLE = 'Discover The Best AI Websites & Tools | TopAICollection'
const SEO_DESCRIPTION = 'Discover thousands of AI tools by category, updated daily. Compare pricing, reviews and traffic to find the best AI for coding, writing, design and video.'
useSeoMeta({
  title: SEO_TITLE,
  description: SEO_DESCRIPTION,
  ogTitle: SEO_TITLE,
  ogDescription: SEO_DESCRIPTION
})

// Site name, logo, social profiles and the search box for search results.
const abs = useAbsoluteUrl()
useJsonLd('site', () => [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': abs('/#organization'),
    name: 'TopAICollection',
    url: abs('/'),
    logo: abs('/topaicollection.png'),
    email: SUPPORT_EMAIL,
    sameAs: SOCIAL_LINKS.map(s => s.url),
    contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', email: SUPPORT_EMAIL, url: abs('/contact') }
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': abs('/#website'),
    name: 'TopAICollection',
    url: abs('/'),
    publisher: { '@id': abs('/#organization') },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${abs('/search')}?q={search_term_string}` },
      'query-input': 'required name=search_term_string'
    }
  }
])
</script>

<template>
  <div>
    <AppHero />

    <section class="mx-auto flex max-w-[1280px] flex-wrap gap-12 px-4 pt-6 pb-14 sm:px-10">
      <!-- Top AI launches -->
      <div class="min-w-0 flex-[999_1_560px]">
        <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div class="flex flex-col">
            <span class="text-sm font-semibold text-brand-600">{{ launchDayLabel }}</span>
            <h2 class="mt-1.5 text-[34px] font-bold tracking-[-.03em] text-ink-900">{{ t('home.topLaunches') }}</h2>
          </div>
          <div class="flex gap-1.5 text-[15px] font-medium" role="tablist">
            <button
              v-for="item in tabs"
              :key="item.key"
              type="button"
              role="tab"
              :aria-selected="tab === item.key"
              :class="['rounded-full border px-3.5 py-[7px]', tab === item.key ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-200 bg-white text-ink-900 hover:border-ink-400']"
              @click="openTab(item.key)"
            >
              {{ t(item.label) }}
            </button>
          </div>
        </div>

        <div
          v-for="(row, i) in rows"
          :key="row.key"
          :data-ad-slot="row.ad?.campaignId"
          :data-ad-placement="row.ad ? 'home' : undefined"
          class="group relative grid grid-cols-[44px_minmax(0,1fr)_52px] items-center gap-4 overflow-hidden rounded-[18px] px-3 py-4 hover:bg-[#FAFAFB] sm:grid-cols-[28px_60px_minmax(0,1fr)_64px]"
        >
          <!-- On hover, the old logo / initials watermark, very faint, left of the vote box. -->
          <img
            v-if="row.tool.logoUrl"
            data-logo
            :src="sizedImage(row.tool.logoUrl, 64, 64)"
            alt=""
            loading="lazy"
            aria-hidden="true"
            class="pointer-events-none absolute -top-4 right-16 h-28 w-28 rounded-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-[0.07] sm:right-20"
          >
          <span v-else class="pointer-events-none absolute right-[72px] top-1 text-[46px] font-extrabold tracking-[.02em] text-brand-500 opacity-0 transition-opacity duration-300 group-hover:opacity-[0.07] sm:right-[92px]" aria-hidden="true">{{ initialsOf(row.tool.name) }}</span>
          <span class="relative hidden text-base font-semibold text-ink-400 sm:block">{{ i + 1 }}</span>
          <NuxtLinkLocale
            :to="row.ad ? row.ad.clickUrl : `/tools/${row.tool.slug}`"
            :external="!!row.ad"
            :target="row.ad ? '_blank' : undefined"
            :rel="row.ad ? 'sponsored nofollow noopener' : undefined"
            class="relative block"
            tabindex="-1"
            aria-hidden="true"
          >
            <img v-if="row.tool.logoUrl" data-logo :src="sizedImage(row.tool.logoUrl, 128, 128)" alt="" loading="lazy" class="h-11 w-11 rounded-2xl object-cover sm:h-[60px] sm:w-[60px]">
            <span v-else class="grid h-11 w-11 place-items-center rounded-2xl text-[15px] font-bold sm:h-[60px] sm:w-[60px] sm:text-xl" :style="tintOf(row.tool.name)">{{ initialsOf(row.tool.name) }}</span>
          </NuxtLinkLocale>
          <NuxtLinkLocale
            :to="row.ad ? row.ad.clickUrl : `/tools/${row.tool.slug}`"
            :external="!!row.ad"
            :target="row.ad ? '_blank' : undefined"
            :rel="row.ad ? 'sponsored nofollow noopener' : undefined"
            class="relative flex min-w-0 flex-col gap-1"
          >
            <span class="flex flex-wrap items-center gap-2 text-[17px] font-semibold text-ink-900">
              {{ row.tool.name }}
              <span v-if="row.ad" class="rounded-full bg-brand-500 px-2 py-[2px] text-[11px] font-semibold text-white">{{ t('sections.sponsorBadge') }}</span>
            </span>
            <span v-if="row.tool.shortDesc" class="line-clamp-2 text-[15px] leading-[1.45] text-ink-700">{{ row.tool.shortDesc }}</span>
            <span class="flex flex-wrap gap-2.5 text-[13px] text-ink-600">
              <template v-if="row.tool.categories?.[0]"><span>{{ row.tool.categories[0].name }}</span><span aria-hidden="true">·</span></template>
              <span>{{ t(`pricing.${row.tool.pricingType}`) }}</span>
              <template v-if="!row.ad"><span aria-hidden="true">·</span><span>{{ reviewsLabel(row.tool as Tool) }}</span></template>
            </span>
          </NuxtLinkLocale>
          <button
            v-if="!row.ad"
            type="button"
            :aria-pressed="isVoted(row.tool.slug)"
            :aria-label="t('home.upvote')"
            :disabled="busy === row.tool.slug"
            :class="['relative flex flex-col items-center gap-0.5 rounded-[14px] border py-2.5 text-sm font-bold transition-colors', isVoted(row.tool.slug) ? 'border-brand-500 bg-brand-500 text-white' : 'border-ink-200 bg-white text-brand-600 hover:border-brand-300']"
            @click="toggle(row.tool as Tool)"
          >
            <span class="text-[11px]" aria-hidden="true">▲</span>
            <span v-if="countOf(row.tool as Tool)">{{ nf.format(countOf(row.tool as Tool)) }}</span>
            <span v-else class="text-[11px] font-semibold">{{ t('home.vote') }}</span>
          </button>
          <span v-else />
        </div>
        <div v-if="!rows.length" class="rounded-[18px] border border-dashed border-ink-200 py-16 text-center text-sm text-ink-400">
          {{ tab === 'today' || otherTabs[tab] ? t('empty.noTools') : '…' }}
        </div>

        <NuxtLinkLocale :to="tabLink[tab]" class="mt-3 block rounded-full border border-ink-200 p-3.5 text-center text-[15px] font-semibold text-ink-900 hover:border-ink-400">
          {{ tab === 'today' && launchCount ? t('home.seeAllLaunches', { n: nf.format(launchCount) }, launchCount) : t('sections.viewAll') }}
        </NuxtLinkLocale>
      </div>

      <!-- Sidebar -->
      <aside class="flex min-w-0 flex-[1_1_300px] flex-col gap-7 pt-2">
        <NewsletterBox />

        <div v-if="news.length">
          <div class="mb-2 flex items-baseline justify-between gap-3">
            <span class="text-[17px] font-bold text-ink-900">{{ t('sidebar.aiNews') }}</span>
            <NuxtLinkLocale to="/ai-news" class="shrink-0 text-sm font-semibold text-brand-600">{{ t('home.viewAll') }}</NuxtLinkLocale>
          </div>
          <AiNewsLink
            v-for="(item, i) in news"
            :key="item.slug"
            :item="item"
            class="flex gap-3 border-b border-[#F3F3F5] py-2 text-[15px] text-ink-900 hover:text-ink-700"
          >
            <span class="w-5 shrink-0 text-sm text-ink-400">{{ i + 1 }}</span>
            <span class="min-w-0 flex-1">{{ item.title }}<span v-if="item.externalUrl" class="text-ink-400"> ↗</span></span>
          </AiNewsLink>
        </div>

        <div v-if="trendingCategories.length">
          <div class="mb-2 flex items-baseline justify-between gap-3">
            <span class="text-[17px] font-bold text-ink-900">{{ trendingTitle }}</span>
            <NuxtLinkLocale to="/category/all" class="shrink-0 text-sm font-semibold text-brand-600">{{ t('home.viewAll') }}</NuxtLinkLocale>
          </div>
          <NuxtLinkLocale
            v-for="(cat, i) in trendingCategories"
            :key="cat.slug"
            :to="`/category/${cat.slug}`"
            class="flex gap-3 border-b border-[#F3F3F5] py-2 text-[15px] text-ink-900 hover:text-ink-700"
          >
            <span class="w-5 shrink-0 text-sm text-ink-400">{{ i + 1 }}</span>
            <span class="min-w-0 flex-1">{{ cat.name }}</span>
            <span v-if="trendingRes?.period === 'all'" class="shrink-0 text-ink-400">{{ nf.format(cat.count) }}</span>
            <span v-else class="shrink-0 font-semibold text-[#298646]">+{{ nf.format(cat.count) }}</span>
          </NuxtLinkLocale>
        </div>

        <div v-if="!news.length && trendingTools.length">
          <div class="mb-2 text-[17px] font-bold text-ink-900">{{ t('home.trendingTools') }}</div>
          <NuxtLinkLocale v-for="tool in trendingTools" :key="tool.slug" :to="`/tools/${tool.slug}`" class="flex items-center gap-3 py-2">
            <img v-if="tool.logoUrl" data-logo :src="sizedImage(tool.logoUrl, 64, 64)" alt="" loading="lazy" class="h-9 w-9 shrink-0 rounded-lg object-cover">
            <span v-else class="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xs font-bold" :style="tintOf(tool.name)">{{ initialsOf(tool.name) }}</span>
            <span class="flex min-w-0 flex-col gap-0.5">
              <span class="truncate text-[15px] font-semibold text-ink-900">{{ tool.name }}</span>
              <span v-if="tool.shortDesc" class="line-clamp-1 text-[13px] text-ink-600">{{ tool.shortDesc }}</span>
            </span>
          </NuxtLinkLocale>
        </div>
      </aside>
    </section>

    <!-- Browse by category -->
    <section class="border-y border-ink-100 bg-[#FAFAFB] px-4 py-12 sm:px-10">
      <div class="mx-auto max-w-[1200px]">
        <div class="mb-[18px] flex items-baseline justify-between gap-4">
          <h2 class="text-[28px] font-bold tracking-[-.02em] text-ink-900">{{ t('sections.browseByCategory') }}</h2>
          <NuxtLinkLocale to="/category/all" class="text-sm font-semibold text-brand-600">{{ t('sections.viewAll') }}</NuxtLinkLocale>
        </div>
        <div class="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2.5">
          <NuxtLinkLocale
            v-for="(cat, i) in browseCategories"
            :key="cat.slug"
            :to="`/category/${cat.slug}`"
            class="flex items-center gap-3 rounded-2xl border border-ink-100 bg-white px-4 py-3.5 hover:border-[#DCDCE2]"
          >
            <span class="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-base" :style="categoryTint(i)" aria-hidden="true"><CategoryIcon :icon="cat.icon" /></span>
            <span class="flex min-w-0 flex-col gap-0.5">
              <span class="truncate text-[15px] font-semibold text-ink-900">{{ cat.name }}</span>
              <span class="text-[13px] text-ink-400">{{ nf.format(cat.count) }}</span>
            </span>
          </NuxtLinkLocale>
        </div>
      </div>
    </section>

    <!-- Featured -->
    <section class="px-4 pt-14 pb-16 sm:px-10">
      <div class="mx-auto max-w-[1200px]">
        <h2 class="mb-1 text-[28px] font-bold tracking-[-.02em] text-ink-900">{{ t('sections.featuredThisWeek') }}</h2>
        <p class="mb-[22px] text-[15px] text-ink-600">{{ t('sections.featuredThisWeekSubtitle') }}</p>
        <div v-if="featuredTools.length" class="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
          <NuxtLinkLocale
            v-for="tool in featuredTools"
            :key="tool.slug"
            :to="`/tools/${tool.slug}`"
            class="relative flex flex-col gap-2 overflow-hidden rounded-2xl border border-ink-100 bg-white p-3.5 transition-shadow hover:shadow-[0_8px_24px_rgba(0,0,0,.06)]"
          >
            <span class="pointer-events-none absolute -right-1.5 top-1 text-[44px] font-extrabold" :style="{ color: tintOf(tool.name).background }" aria-hidden="true">{{ initialsOf(tool.name) }}</span>
            <span class="relative flex items-center gap-2.5">
              <img v-if="tool.logoUrl" data-logo :src="sizedImage(tool.logoUrl, 64, 64)" alt="" loading="lazy" class="h-[30px] w-[30px] shrink-0 rounded-full object-cover">
              <span v-else class="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full text-xs font-bold" :style="tintOf(tool.name)">{{ initialsOf(tool.name) }}</span>
              <span class="text-[15px] font-bold leading-tight text-ink-900">{{ tool.name }}</span>
            </span>
            <span v-if="tool.shortDesc" class="relative line-clamp-2 text-[13px] leading-normal text-ink-700">{{ tool.shortDesc }}</span>
          </NuxtLinkLocale>
        </div>
        <div v-else class="rounded-xl border border-dashed border-ink-200 py-16 text-center text-sm text-ink-400">{{ t('empty.noTools') }}</div>
      </div>
    </section>
  </div>
</template>
