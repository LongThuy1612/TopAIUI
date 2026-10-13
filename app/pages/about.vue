<script setup lang="ts">
import type { ToolsResponse } from '~/types'

const { t, locale, locales } = useI18n()

// Same requests as the home hero (both cached), so the numbers match it.
const [{ data: totalRes }, { data: categories }] = await Promise.all([
  useFetch<ToolsResponse>('/api/tools', { query: computed(() => ({ limit: 1, sort: 'newest', locale: locale.value })) }),
  useCategories()
])
const nf = computed(() => new Intl.NumberFormat(locale.value))
const stats = computed(() => [
  { key: 'tools', value: nf.value.format(totalRes.value?.total ?? 0) },
  { key: 'categories', value: nf.value.format(categories.value?.length ?? 0) },
  { key: 'languages', value: nf.value.format(locales.value.length) }
])

const features = [
  { key: 'global', icon: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0 0c2.5-2.5 3.5-5.5 3.5-9S14.5 5.5 12 3m0 18c-2.5-2.5-3.5-5.5-3.5-9S9.5 5.5 12 3M3.5 9h17m-17 6h17' },
  { key: 'updated', icon: 'M4 4v6h6M20 20v-6h-6M5.6 15a7 7 0 0 0 12.3 2.3M18.4 9A7 7 0 0 0 6.1 6.7' },
  { key: 'community', icon: 'M17 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1m18 0v-1a4 4 0 0 0-3-3.9M14 3.1a4 4 0 0 1 0 7.8M14 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z' },
  { key: 'verified', icon: 'M9 12.5l2 2 4-4.5M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3Z' }
]

const abs = useAbsoluteUrl()
const localePath = useLocalePath()
const organization = useOrganizationNode()
useBreadcrumbLd(() => [[t('footer.aboutUs'), '/about']])
useJsonLd('page', () => ({
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  name: t('aboutPage.meta.title'),
  description: t('aboutPage.meta.description'),
  url: abs(localePath('/about')),
  about: organization
}))

useSeoMeta({
  title: () => t('aboutPage.meta.title'),
  description: () => t('aboutPage.meta.description'),
  ogTitle: () => t('aboutPage.meta.title'),
  ogDescription: () => t('aboutPage.meta.description')
})
</script>

<template>
  <div class="mx-auto max-w-[1100px] px-4 py-12 sm:px-6 lg:px-8">
    <section class="text-center">
      <span class="inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-600">{{ t('aboutPage.badge') }}</span>
      <h1 class="mx-auto mt-4 max-w-3xl text-3xl font-extrabold leading-tight text-ink-900 sm:text-5xl">{{ t('aboutPage.hero.title') }}</h1>
      <p class="mx-auto mt-4 max-w-2xl text-base text-ink-600 sm:text-lg">{{ t('aboutPage.hero.subtitle') }}</p>
    </section>

    <section class="mt-10 grid grid-cols-3 gap-3 sm:gap-6">
      <div v-for="s in stats" :key="s.key" class="rounded-2xl border border-ink-200 bg-white px-3 py-5 text-center">
        <div class="text-2xl font-extrabold text-brand-500 sm:text-3xl">{{ s.value }}</div>
        <div class="mt-1 text-xs text-ink-500 sm:text-sm">{{ t(`aboutPage.stats.${s.key}`) }}</div>
      </div>
    </section>

    <section class="mx-auto mt-14 max-w-3xl">
      <h2 class="text-2xl font-extrabold text-ink-900">{{ t('aboutPage.mission.title') }}</h2>
      <div class="mt-4 space-y-4 text-[1.0625rem] leading-[1.8] text-ink-700">
        <p>{{ t('aboutPage.mission.paragraph1') }}</p>
        <p>{{ t('aboutPage.mission.paragraph2') }}</p>
        <p>{{ t('aboutPage.mission.paragraph3') }}</p>
      </div>
    </section>

    <section class="mt-14">
      <h2 class="text-center text-2xl font-extrabold text-ink-900">{{ t('aboutPage.features.title') }}</h2>
      <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div v-for="f in features" :key="f.key" class="rounded-2xl border border-ink-200 bg-white p-5">
          <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" :d="f.icon" /></svg>
          </span>
          <h3 class="mt-3 font-bold text-ink-900">{{ t(`aboutPage.features.${f.key}.title`) }}</h3>
          <p class="mt-1 text-sm leading-relaxed text-ink-600">{{ t(`aboutPage.features.${f.key}.description`) }}</p>
        </div>
      </div>
    </section>

    <section class="mt-14 rounded-3xl bg-gradient-to-br from-brand-50 to-white px-6 py-10 text-center">
      <h2 class="text-2xl font-extrabold text-ink-900">{{ t('aboutPage.cta.title') }}</h2>
      <p class="mt-2 text-ink-600">{{ t('aboutPage.cta.subtitle') }}</p>
      <div class="mt-6 flex flex-wrap justify-center gap-3">
        <NuxtLinkLocale to="/category/all" class="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-600">{{ t('aboutPage.cta.browse') }}</NuxtLinkLocale>
        <NuxtLinkLocale to="/submit" class="rounded-xl border border-brand-300 bg-white px-5 py-2.5 text-sm font-bold text-brand-600 hover:bg-brand-50">{{ t('aboutPage.cta.submit') }}</NuxtLinkLocale>
      </div>
    </section>
  </div>
</template>
