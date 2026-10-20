<script setup lang="ts">
// One category's page (a group's covers every category under it): "Best N <name> tools in
// <year>", the top tool names, then each tool as a full card — what it does, rating,
// reviews, saves, a Visit button, and folding sections for its pricing plans (open),
// what it is, core features and use cases. Side column: a call to list a tool here, and
// sponsored then featured tools. Data: server/api/categories/[slug]/tools.get.ts.
import type { AdSlot } from '~/types'
import { siteDay } from '#shared/time'
import { PUBLIC_LIMITS } from '#shared/research'

interface Plan { name: string; price: string; period: string; features: string[] }
interface Item {
  slug: string; name: string; logoUrl: string | null; website: string | null; pricingType: string
  averageRating: number; reviewCount: number; collectionCount: number
  shortDesc: string | null; whatIs: string | null; coreFeatures: string[]; useCases: string[]; pricingPlans: Plan[]
}
interface Side { slug: string; name: string; logoUrl: string | null; pricingType: string; shortDesc: string | null }
interface Res {
  category: { slug: string; name: string; icon: string; description: string | null; group: { slug: string; name: string } | null } | null
  items: Item[]; total: number; categoryTotal: number; page: number; pageCount: number; loginRequired: boolean; topNames: string[]; featured: Side[]
}

const props = defineProps<{ slug: string }>()
const { t, locale } = useI18n()
const route = useRoute()
const nf = computed(() => new Intl.NumberFormat(locale.value))

const SORTS = ['default', 'newest', 'saved', 'rating', 'name'] as const
const TYPES = ['FREE', 'FREEMIUM', 'PAID'] as const
const sort = ref<(typeof SORTS)[number]>(SORTS.find(s => s === route.query.sort) ?? 'default')
const pricing = ref<'all' | (typeof TYPES)[number]>(TYPES.find(p => p === route.query.pricing) ?? 'all')
// ?page= opens that page (a shared link to page 3 lands on page 3).
const page = ref(Math.max(1, Math.floor(Number(route.query.page)) || 1))
watch([sort, pricing], () => { page.value = 1 })
const listTop = ref<HTMLElement | null>(null)
watch(page, () => { if (import.meta.client) listTop.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }) })

// Deeper pages carry the login token: guests stop at the first PUBLIC_LIMITS.guestListTools tools.
const { authHeaders } = useAuth()
const { data, pending, error } = await useFetch<Res>(() => `/api/categories/${encodeURIComponent(props.slug)}/tools`, {
  headers: computed(() => (page.value > 1 ? authHeaders() : {})),
  query: computed(() => ({ sort: sort.value === 'default' ? undefined : sort.value, pricing: pricing.value === 'all' ? undefined : pricing.value, page: page.value, locale: locale.value }))
})
// A failed request is an error page of its own kind; only a category that isn't there is a 404.
if (error.value) throw createError({ statusCode: error.value.statusCode || 500, fatal: true })
if (!data.value?.category) throw createError({ statusCode: 404, statusMessage: 'Category not found', fatal: true })

const category = computed(() => data.value?.category)
const name = computed(() => category.value?.name ?? props.slug)
const items = computed(() => data.value?.items ?? [])
const total = computed(() => data.value?.total ?? 0)
// The heading counts the whole category, not what the pricing filter leaves.
const categoryTotal = computed(() => data.value?.categoryTotal ?? total.value)
const year = siteDay().slice(0, 4)
// Guests can't page past PUBLIC_LIMITS.guestListTools tools, so they don't get those page
// numbers either. Decided after mount: the login token only exists in the browser.
const { token } = useAuth()
const mounted = ref(false)
onMounted(() => { mounted.value = true })
const pageCount = computed(() => {
  const all = data.value?.pageCount ?? 1
  return mounted.value && token.value ? all : Math.min(all, Math.ceil(PUBLIC_LIMITS.guestListTools / 10))
})

// Folding sections: pricing starts open, the rest closed.
const toggled = ref(new Set<string>())
const isOpen = (slug: string, section: string) => toggled.value.has(`${slug}:${section}`) !== (section === 'pricing')
function flip(slug: string, section: string) {
  const key = `${slug}:${section}`
  const next = new Set(toggled.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  toggled.value = next
}
const sectionsOf = (tool: Item) => [
  tool.pricingPlans.length && { key: 'pricing', label: t('categoryPage.pricing', { name: tool.name }) },
  tool.whatIs && { key: 'whatIs', label: t('categoryPage.whatIs', { name: tool.name }) },
  tool.coreFeatures.length && { key: 'features', label: t('categoryPage.coreFeatures', { name: tool.name }) },
  tool.useCases.length && { key: 'useCases', label: t('categoryPage.useCases', { name: tool.name }) }
].filter(Boolean) as { key: string; label: string }[]

const ratingOf = (tool: Item) => (tool.reviewCount ? tool.averageRating : 5)

// A "Visit" click counts toward Hot this week (server/utils/toolStats.ts), like on a tool's page.
function trackVisit(slug: string) {
  const url = `/api/tools/${encodeURIComponent(slug)}/track`
  const body = JSON.stringify({ kind: 'visit' })
  if (navigator.sendBeacon?.(url, new Blob([body], { type: 'application/json' }))) return
  $fetch(url, { method: 'POST', body: { kind: 'visit' } }).catch(() => {})
}

// Side column: sponsored tools of this category, then featured ones, eight in all.
const NuxtLinkLocale = resolveComponent('NuxtLinkLocale')
const { slots: adSlots } = useAdSlots('category', { category: () => props.slug, positions: [], limit: 8 })
const side = computed(() => {
  const ads = adSlots.value.map((ad: AdSlot) => ({ key: `ad-${ad.campaignId}`, ad, slug: ad.tool.slug, name: ad.tool.name, logoUrl: ad.tool.logoUrl, shortDesc: ad.tool.shortDesc ?? null, pricingType: ad.tool.pricingType }))
  const taken = new Set(ads.map(a => a.slug))
  const featured = (data.value?.featured ?? []).filter(f => !taken.has(f.slug)).map(f => ({ key: f.slug, ad: undefined, ...f }))
  return [...ads, ...featured].slice(0, 8)
})

const pageUrl = useRequestURL()
const shareX = computed(() => `https://twitter.com/intent/tweet?url=${encodeURIComponent(pageUrl.href)}&text=${encodeURIComponent(t('categoryPage.heading', { count: categoryTotal.value, name: name.value, year }))}`)
const shareFacebook = computed(() => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl.href)}`)

const seoTitle = computed(() => `${t('categoryPage.heading', { count: categoryTotal.value, name: name.value, year })} — TopAICollection`)
const seoDescription = computed(() => category.value?.description
  || (data.value?.topNames.length ? `${data.value.topNames.slice(0, 6).join(', ')} ${t('categoryPage.introEnd', { name: name.value })}` : t('categoryPage.heading', { count: categoryTotal.value, name: name.value, year })))
useSeoMeta({
  title: seoTitle,
  description: seoDescription,
  ogTitle: seoTitle,
  ogDescription: seoDescription,
  // A category without tools is an empty page: not for search engines (nor the sitemap).
  robots: () => (categoryTotal.value ? undefined : 'noindex')
})
useBreadcrumbLd(() => [
  ['Categories', '/categories'],
  ...(category.value?.group ? [[category.value.group.name, `/category/${category.value.group.slug}`] as [string, string]] : []),
  [name.value, `/category/${props.slug}`]
])
</script>

<template>
  <div class="bg-[#FAFAFB]">
    <div class="mx-auto max-w-[1280px] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <nav class="flex flex-wrap items-center gap-1.5 text-sm text-ink-500">
        <NuxtLinkLocale to="/" class="text-ink-900 hover:text-brand-600">{{ t('category.breadcrumbHome') }}</NuxtLinkLocale>
        <span aria-hidden="true">›</span>
        <NuxtLinkLocale to="/categories" class="text-ink-900 hover:text-brand-600">{{ t('categoriesPage.breadcrumb') }}</NuxtLinkLocale>
        <span aria-hidden="true">›</span>
        <template v-if="category?.group">
          <NuxtLinkLocale :to="`/category/${category.group.slug}`" class="text-ink-900 hover:text-brand-600">{{ category.group.name }}</NuxtLinkLocale>
          <span aria-hidden="true">›</span>
        </template>
        <span>{{ name }}</span>
      </nav>

      <header class="mx-auto mt-8 max-w-[960px] text-center">
        <i18n-t keypath="categoryPage.heading" tag="h1" scope="global" class="text-[30px] font-extrabold leading-tight tracking-[-.02em] text-ink-900 sm:text-[44px]">
          <template #count>{{ nf.format(categoryTotal) }}</template>
          <template #name><span class="text-brand-500">{{ name }}</span></template>
          <template #year>{{ year }}</template>
        </i18n-t>
        <p v-if="data?.topNames.length" class="mt-4 text-sm leading-relaxed text-ink-600">
          {{ data.topNames.join(', ') }} {{ t('categoryPage.introEnd', { name }) }}
        </p>
      </header>

      <div class="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div ref="listTop" class="min-w-0 scroll-mt-[88px]">
          <div class="flex flex-wrap items-center gap-3">
            <!-- The browser's own select arrow sits against the edge; this one is drawn. -->
            <label class="relative">
              <select v-model="sort" :aria-label="t('categoryPage.sortLabel')" class="h-11 w-full min-w-[180px] cursor-pointer appearance-none rounded-lg border border-ink-200 bg-white pl-3.5 pr-10 text-[15px] text-ink-900 outline-none transition hover:border-ink-300 focus:border-brand-400 focus:ring-4 focus:ring-brand-100">
                <option v-for="s in SORTS" :key="s" :value="s">{{ t(`categoryPage.sort.${s}`) }}</option>
              </select>
              <svg class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" fill="none" viewBox="0 0 20 20" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m5 7.5 5 5 5-5" /></svg>
            </label>
            <label class="relative">
              <select v-model="pricing" :aria-label="t('categoryPage.typeLabel')" class="h-11 w-full min-w-[180px] cursor-pointer appearance-none rounded-lg border border-ink-200 bg-white pl-3.5 pr-10 text-[15px] text-ink-900 outline-none transition hover:border-ink-300 focus:border-brand-400 focus:ring-4 focus:ring-brand-100">
                <option value="all">{{ t('categoryPage.typeAll') }}</option>
                <option v-for="p in TYPES" :key="p" :value="p">{{ t(`pricing.${p}`) }}</option>
              </select>
              <svg class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" fill="none" viewBox="0 0 20 20" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m5 7.5 5 5 5-5" /></svg>
            </label>
            <div class="ml-auto flex gap-2">
              <a :href="shareX" target="_blank" rel="noopener noreferrer" :title="t('categoryPage.shareX')" :aria-label="t('categoryPage.shareX')" class="grid h-10 w-10 place-items-center rounded-lg border border-ink-200 bg-white text-ink-900 hover:border-brand-300 hover:text-brand-600">𝕏</a>
              <a :href="shareFacebook" target="_blank" rel="noopener noreferrer" :title="t('categoryPage.shareFacebook')" :aria-label="t('categoryPage.shareFacebook')" class="grid h-10 w-10 place-items-center rounded-lg border border-ink-200 bg-white text-lg font-bold text-[#1877F2] hover:border-brand-300">f</a>
            </div>
          </div>

          <p v-if="category?.description" class="mt-6 text-[15px] leading-relaxed text-ink-800">{{ category.description }}</p>

          <div :class="['mt-6 space-y-8 transition-opacity', pending && 'opacity-60']">
            <div v-for="tool in items" :key="tool.slug">
              <article class="overflow-hidden rounded-2xl border border-ink-200 bg-white">
                <div class="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
                  <NuxtLinkLocale :to="`/tools/${tool.slug}`" class="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-ink-100 bg-white" tabindex="-1" aria-hidden="true">
                    <img v-if="tool.logoUrl" data-logo :src="sizedImage(tool.logoUrl, 80, 80)" alt="" loading="lazy" class="h-full w-full object-cover">
                    <span v-else class="text-2xl font-bold text-brand-600">{{ tool.name.charAt(0).toUpperCase() }}</span>
                  </NuxtLinkLocale>
                  <div class="min-w-0 flex-1">
                    <h2 class="text-xl font-bold text-ink-900 sm:text-2xl">
                      <NuxtLinkLocale :to="`/tools/${tool.slug}`" class="hover:text-brand-600">{{ tool.name }}</NuxtLinkLocale>
                    </h2>
                    <p v-if="tool.shortDesc" class="mt-1.5 text-[15px] font-semibold leading-snug text-ink-800">{{ tool.shortDesc }}</p>
                    <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-700">
                      <span class="flex items-center gap-1">
                        <span class="flex text-brand-500" aria-hidden="true">
                          <svg v-for="i in 5" :key="i" class="h-4 w-4" viewBox="0 0 20 20" :fill="i <= Math.round(ratingOf(tool)) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1"><path d="M10 1.3l2.7 5.5 6 .88-4.35 4.24 1.03 6L10 14.9l-5.38 2.83 1.03-6L1.3 7.67l6-.87z" /></svg>
                        </span>
                        <span>{{ Number.isInteger(ratingOf(tool)) ? ratingOf(tool) : ratingOf(tool).toFixed(1) }}</span>
                      </span>
                      <span class="h-4 w-px bg-ink-200" aria-hidden="true" />
                      <span>{{ t('categoryPage.reviews', { n: nf.format(tool.reviewCount) }, tool.reviewCount) }}</span>
                      <span class="h-4 w-px bg-ink-200" aria-hidden="true" />
                      <span>{{ t('categoryPage.saved', { n: nf.format(tool.collectionCount) }) }}</span>
                    </div>
                  </div>
                  <a
                    v-if="tool.website"
                    :href="tool.website"
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    class="shrink-0 rounded-lg border border-brand-200 bg-brand-50 px-5 py-2.5 text-center text-[15px] font-semibold text-brand-700 transition hover:border-brand-300 hover:bg-brand-100 sm:max-w-[320px]"
                    @click="trackVisit(tool.slug)"
                    @auxclick="trackVisit(tool.slug)"
                  >
                    {{ t('categoryPage.visit', { name: tool.name }) }}
                  </a>
                </div>

                <div v-for="section in sectionsOf(tool)" :key="section.key" class="border-t border-ink-100">
                  <button
                    type="button"
                    :aria-expanded="isOpen(tool.slug, section.key)"
                    class="flex w-full items-center justify-between gap-3 bg-[#F7F7F9] px-5 py-4 text-left text-[16px] font-semibold text-ink-900 hover:bg-ink-100/60 sm:px-6"
                    @click="flip(tool.slug, section.key)"
                  >
                    {{ section.label }}
                    <svg :class="['h-5 w-5 shrink-0 text-ink-500 transition-transform', isOpen(tool.slug, section.key) ? 'rotate-90' : '']" fill="none" viewBox="0 0 20 20" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m7.5 5 5 5-5 5" /></svg>
                  </button>
                  <div v-if="isOpen(tool.slug, section.key)" class="px-5 py-5 sm:px-6">
                    <div v-if="section.key === 'pricing'" class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      <div v-for="(plan, p) in tool.pricingPlans" :key="p" class="rounded-xl border border-ink-200 p-4">
                        <p class="text-ink-900"><span class="text-lg font-bold">{{ plan.price }}</span><span v-if="plan.period" class="text-sm text-ink-500"> / {{ plan.period }}</span></p>
                        <p class="mt-1.5 font-semibold text-ink-800">{{ plan.name }}</p>
                        <p v-if="plan.features.length" class="mt-1 text-sm leading-relaxed text-ink-600">{{ plan.features.join(', ') }}</p>
                      </div>
                    </div>
                    <p v-else-if="section.key === 'whatIs'" class="text-[15px] leading-relaxed text-ink-800">{{ tool.whatIs }}</p>
                    <ul v-else class="list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-ink-800">
                      <li v-for="(line, i) in (section.key === 'features' ? tool.coreFeatures : tool.useCases)" :key="i">{{ line }}</li>
                    </ul>
                  </div>
                </div>
              </article>
              <div v-if="tool.website" class="mt-5 text-center">
                <a :href="tool.website" target="_blank" rel="noopener noreferrer nofollow" class="inline-block rounded-lg border border-brand-300 bg-white px-6 py-2.5 text-[15px] font-semibold text-brand-600 transition hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700" @click="trackVisit(tool.slug)" @auxclick="trackVisit(tool.slug)">
                  {{ t('categoryPage.tryIt', { name: tool.name }) }}
                </a>
              </div>
            </div>

            <p v-if="!items.length && !pending && !data?.loginRequired" class="rounded-2xl border border-dashed border-ink-200 bg-white py-16 text-center text-sm text-ink-400">{{ t('categoryPage.empty') }}</p>
          </div>

          <p v-if="data?.loginRequired" class="mt-6 text-center text-sm text-ink-600">
            <NuxtLinkLocale :to="{ path: '/login', query: { redirect: route.fullPath } }" class="font-semibold text-brand-600 hover:text-brand-700">{{ t('categoryPage.loginMore') }}</NuxtLinkLocale>
          </p>
          <Pagination v-model:page="page" :page-count="pageCount" />
        </div>

        <aside class="space-y-5">
          <div class="rounded-2xl border border-brand-200 bg-gradient-to-b from-[#FFF3F0] to-white p-5">
            <i18n-t keypath="categoryPage.launchTitle" tag="p" scope="global" class="text-lg font-bold leading-snug text-ink-900">
              <template #name><span class="text-brand-500">{{ name }}</span></template>
            </i18n-t>
            <p class="mt-2 text-sm text-ink-600">{{ t('categoryPage.launchText') }}</p>
            <NuxtLinkLocale to="/submit" class="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-black">
              {{ t('categoryPage.launchButton') }} <span aria-hidden="true">→</span>
            </NuxtLinkLocale>
          </div>

          <div v-if="side.length">
            <h2 class="text-2xl font-bold text-ink-900">{{ t('categoryPage.featured') }}</h2>
            <div class="mt-4 space-y-3">
              <component
                :is="entry.ad ? 'a' : NuxtLinkLocale"
                v-for="entry in side"
                :key="entry.key"
                v-bind="entry.ad ? { href: entry.ad.clickUrl, target: '_blank', rel: 'sponsored nofollow noopener' } : { to: `/tools/${entry.slug}` }"
                :data-ad-slot="entry.ad?.campaignId"
                :data-ad-placement="entry.ad ? 'category' : undefined"
                class="relative block rounded-2xl border border-ink-200 bg-white p-4 transition hover:border-brand-300"
              >
                <span v-if="entry.ad" class="absolute right-3 top-3 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-600">{{ t('sections.sponsorBadge') }}</span>
                <span :class="['flex items-center gap-2.5', entry.ad && 'pr-16']">
                  <img v-if="entry.logoUrl" data-logo :src="sizedImage(entry.logoUrl, 32, 32)" alt="" loading="lazy" class="h-8 w-8 shrink-0 rounded-lg object-cover">
                  <span v-else class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-sm font-bold text-brand-600">{{ entry.name.charAt(0).toUpperCase() }}</span>
                  <span class="truncate font-bold text-ink-900">{{ entry.name }}</span>
                </span>
                <span v-if="entry.shortDesc" class="mt-2 line-clamp-2 block text-sm leading-snug text-ink-600">{{ entry.shortDesc }}</span>
              </component>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>
