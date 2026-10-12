<script setup lang="ts">
const { t, locale } = useI18n()

// Matches the effective date of the Privacy Policy (app/content/legal/privacy.md).
const UPDATED = '2026-10-12'
const updated = computed(() => new Date(UPDATED).toLocaleDateString(locale.value, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }))

useBreadcrumbLd(() => [[t('cookiesPage.title'), '/cookies']])

useSeoMeta({
  title: () => t('cookiesPage.meta.title'),
  description: () => t('cookiesPage.meta.description'),
  ogTitle: () => t('cookiesPage.meta.title'),
  ogDescription: () => t('cookiesPage.meta.description')
})
</script>

<template>
  <div class="mx-auto max-w-[860px] px-4 py-10 sm:px-6 lg:px-8">
    <nav class="flex items-center gap-1.5 text-xs text-ink-400">
      <NuxtLinkLocale to="/" class="hover:text-brand-600">{{ t('category.breadcrumbHome') }}</NuxtLinkLocale>
      <span>›</span>
      <span>{{ t('cookiesPage.title') }}</span>
    </nav>
    <h1 class="mt-4 text-3xl font-extrabold leading-tight text-ink-900 sm:text-4xl">{{ t('cookiesPage.title') }}</h1>
    <p class="mt-3 text-sm text-ink-500">{{ t('cookiesPage.lastUpdated') }}: {{ updated }}</p>

    <div class="mt-8 space-y-9 text-[1.0625rem] leading-[1.8] text-ink-800">
      <section>
        <h2 class="text-2xl font-extrabold text-ink-900">{{ t('cookiesPage.sections.whatAreCookies.title') }}</h2>
        <p class="mt-3">{{ t('cookiesPage.sections.whatAreCookies.description') }}</p>
      </section>

      <section>
        <h2 class="text-2xl font-extrabold text-ink-900">{{ t('cookiesPage.sections.howWeUse.title') }}</h2>
        <p class="mt-3">{{ t('cookiesPage.sections.howWeUse.intro') }}</p>
        <ul class="mt-3 list-disc space-y-1.5 pl-6">
          <li>{{ t('cookiesPage.sections.howWeUse.preference') }}</li>
          <li>{{ t('cookiesPage.sections.howWeUse.storage') }}</li>
        </ul>
        <p class="mt-3 font-semibold">{{ t('cookiesPage.sections.howWeUse.noTracking') }}</p>
      </section>

      <section>
        <h2 class="text-2xl font-extrabold text-ink-900">{{ t('cookiesPage.sections.thirdParty.title') }}</h2>
        <p class="mt-3">{{ t('cookiesPage.sections.thirdParty.intro') }}</p>
        <ul class="mt-3 list-disc space-y-1.5 pl-6">
          <li>{{ t('cookiesPage.sections.thirdParty.stripe') }}</li>
          <li>{{ t('cookiesPage.sections.thirdParty.google') }}</li>
        </ul>
      </section>

      <section>
        <h2 class="text-2xl font-extrabold text-ink-900">{{ t('cookiesPage.sections.managing.title') }}</h2>
        <p class="mt-3">{{ t('cookiesPage.sections.managing.intro') }}</p>
        <ul class="mt-3 list-disc space-y-1.5 pl-6">
          <li>{{ t('cookiesPage.sections.managing.blockAll') }}</li>
          <li>{{ t('cookiesPage.sections.managing.acceptAll') }}</li>
          <li>{{ t('cookiesPage.sections.managing.beNotified') }}</li>
          <li>{{ t('cookiesPage.sections.managing.deleteExisting') }}</li>
        </ul>
        <p class="mt-3">{{ t('cookiesPage.sections.managing.note') }}</p>
      </section>

      <section>
        <h2 class="text-2xl font-extrabold text-ink-900">{{ t('cookiesPage.sections.contact.title') }}</h2>
        <p class="mt-3">
          {{ t('cookiesPage.sections.contact.message') }}
          <NuxtLinkLocale to="/contact" class="font-semibold text-brand-600 underline underline-offset-2 hover:text-brand-700">{{ t('cookiesPage.sections.contact.contactLink') }}</NuxtLinkLocale>.
        </p>
      </section>
    </div>
  </div>
</template>
