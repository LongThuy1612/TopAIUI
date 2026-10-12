<script setup lang="ts">
const { t } = useI18n()

const topics = [
  { key: 'submitTool', to: '/faq#submission' },
  { key: 'advertising', to: '/advertise' },
  { key: 'privacy', to: '/privacy' },
  { key: 'terms', to: '/terms' }
]

useBreadcrumbLd(() => [[t('footer.help'), '/help']])

useSeoMeta({
  title: () => t('helpPage.meta.title'),
  description: () => t('helpPage.meta.description'),
  ogTitle: () => t('helpPage.meta.title'),
  ogDescription: () => t('helpPage.meta.description')
})
</script>

<template>
  <div class="mx-auto max-w-[860px] px-4 py-12 sm:px-6 lg:px-8">
    <section class="text-center">
      <h1 class="text-3xl font-extrabold text-ink-900 sm:text-4xl">{{ t('helpPage.title') }}</h1>
      <p class="mt-3 text-ink-600">{{ t('helpPage.subtitle') }}</p>
    </section>

    <section class="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <NuxtLink to="/faq" class="group rounded-2xl border border-ink-200 bg-white p-6 transition hover:border-brand-300 hover:shadow-sm">
        <h2 class="text-lg font-extrabold text-ink-900">{{ t('helpPage.sections.faq.title') }}</h2>
        <p class="mt-1 text-sm text-ink-600">{{ t('helpPage.sections.faq.description') }}</p>
        <span class="mt-4 inline-block text-sm font-bold text-brand-600 group-hover:text-brand-700">{{ t('helpPage.sections.faq.link') }} →</span>
      </NuxtLink>
      <NuxtLink to="/contact" class="group rounded-2xl border border-ink-200 bg-white p-6 transition hover:border-brand-300 hover:shadow-sm">
        <h2 class="text-lg font-extrabold text-ink-900">{{ t('helpPage.sections.contact.title') }}</h2>
        <p class="mt-1 text-sm text-ink-600">{{ t('helpPage.sections.contact.description') }}</p>
        <span class="mt-4 inline-block text-sm font-bold text-brand-600 group-hover:text-brand-700">{{ t('helpPage.sections.contact.link') }} →</span>
      </NuxtLink>
    </section>

    <section class="mt-10">
      <h2 class="text-xl font-extrabold text-ink-900">{{ t('helpPage.commonTopics.title') }}</h2>
      <div class="mt-4 divide-y divide-ink-100 overflow-hidden rounded-2xl border border-ink-200 bg-white">
        <NuxtLink v-for="topic in topics" :key="topic.key" :to="topic.to" class="flex items-center justify-between gap-4 px-5 py-4 font-semibold text-ink-900 hover:bg-ink-100/40">
          {{ t(`helpPage.commonTopics.${topic.key}`) }}
          <svg class="h-4 w-4 shrink-0 text-ink-400" fill="none" viewBox="0 0 20 20" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m7.5 5 5 5-5 5" /></svg>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
