<script setup lang="ts">
const { t } = useI18n()

const GROUPS = ['general', 'tools', 'submission', 'account'] as const
const groups = computed(() => GROUPS.map(g => ({
  key: g,
  items: [0, 1, 2].map(i => ({
    q: t(`faqPage.questions.${g}.${i}.question`),
    a: t(`faqPage.questions.${g}.${i}.answer`)
  }))
})))

useSeoMeta({
  title: () => t('faqPage.meta.title'),
  description: () => t('faqPage.meta.description'),
  ogTitle: () => t('faqPage.meta.title'),
  ogDescription: () => t('faqPage.meta.description')
})

// FAQ rich results in search.
useBreadcrumbLd(() => [[t('footer.faq'), '/faq']])
useJsonLd('page', () => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: groups.value.flatMap(g => g.items.map(it => ({
    '@type': 'Question',
    name: it.q,
    acceptedAnswer: { '@type': 'Answer', text: it.a }
  })))
}))
</script>

<template>
  <div class="mx-auto max-w-[860px] px-4 py-12 sm:px-6 lg:px-8">
    <section class="text-center">
      <span class="inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-600">{{ t('faqPage.badge') }}</span>
      <h1 class="mt-4 text-3xl font-extrabold text-ink-900 sm:text-4xl">{{ t('faqPage.title') }}</h1>
      <p class="mt-3 text-ink-600">{{ t('faqPage.subtitle') }}</p>
    </section>

    <section v-for="g in groups" :id="g.key" :key="g.key" class="mt-10 scroll-mt-24">
      <h2 class="text-xl font-extrabold text-ink-900">{{ t(`faqPage.categories.${g.key}`) }}</h2>
      <div class="mt-4 divide-y divide-ink-100 overflow-hidden rounded-2xl border border-ink-200 bg-white">
        <details v-for="(it, i) in g.items" :key="i" class="group">
          <summary class="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-ink-900 hover:bg-ink-100/40 [&::-webkit-details-marker]:hidden">
            {{ it.q }}
            <svg class="h-4 w-4 shrink-0 text-ink-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 20 20" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m5 7.5 5 5 5-5" /></svg>
          </summary>
          <p class="px-5 pb-4 leading-relaxed text-ink-700">{{ it.a }}</p>
        </details>
      </div>
    </section>

    <section class="mt-14 rounded-3xl bg-gradient-to-br from-brand-50 to-white px-6 py-10 text-center">
      <h2 class="text-2xl font-extrabold text-ink-900">{{ t('faqPage.cta.title') }}</h2>
      <p class="mt-2 text-ink-600">{{ t('faqPage.cta.subtitle') }}</p>
      <NuxtLink to="/contact" class="mt-6 inline-block rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-600">{{ t('faqPage.cta.button') }}</NuxtLink>
    </section>
  </div>
</template>
