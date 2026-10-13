<script setup lang="ts">
import { SUPPORT_EMAIL, SOCIAL_LINKS } from '#shared/site'

const { t, locale, locales } = useI18n()
const { switchLanguage, pathFor } = useSwitchLanguage()

// Plain clicks switch in place; Ctrl/Cmd/Shift/middle clicks keep the browser's
// own behaviour (new tab / window) on these real links.
function onLanguageClick(e: MouseEvent, code: string) {
  if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return
  e.preventDefault()
  switchLanguage(code)
}

const year = new Date().getFullYear()

const { data: footerCategories } = await useCategories()

const sortedFooterCategories = computed(() =>
  [...(footerCategories.value ?? [])].sort((a, b) => b.count - a.count)
)

const topAiToolsLinks = computed(() =>
  sortedFooterCategories.value
    .slice(0, 20)
    .map(cat => ({ label: t('footer.categoryToolsCount', { count: cat.count, name: cat.name }), to: `/category/${cat.slug}` }))
)

const moreToolsLinks = computed(() =>
  sortedFooterCategories.value
    .slice(20, 35)
    .map(cat => ({ label: t('footer.categoryTools', { name: cat.name }), to: `/category/${cat.slug}` }))
)

const aboutLinks = [
  { key: 'aboutUs', to: '/about' },
  { key: 'pricing', to: '/pricing' },
  { key: 'faq', to: '/faq' },
  { key: 'help', to: '/help' },
  { key: 'editorialGuidelines', to: '/editorial-guidelines' },
  { key: 'reviewMethodology', to: '/review-methodology' },
  { key: 'terms', to: '/terms' },
  { key: 'privacy', to: '/privacy' },
  { key: 'cookies', to: '/cookies' }
]
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
// Last 9 days before today, in UTC so server and client render the same dates
// and they match the /archive/[date] filter on addedOn.
const archiveDates = Array.from({ length: 9 }, (_, i) => {
  const iso = new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  return { iso, label: `${iso.slice(5, 7)}/${iso.slice(8, 10)}` }
})
</script>

<template>
  <footer class="w-full border-t border-ink-200 bg-white px-4 pt-[72px] pb-9 sm:px-6 lg:px-8">
    <div class="mx-auto grid max-w-[1440px] grid-cols-[repeat(auto-fit,minmax(205px,1fr))] items-start gap-11">

      <div>
        <div class="eyebrow-strong">{{ t('footer.topAiTools') }}</div>
        <div class="flex flex-col gap-[11px] pt-[18px] text-[13.5px] leading-relaxed">
          <NuxtLinkLocale v-for="link in topAiToolsLinks" :key="link.to" :to="link.to" class="text-[rgb(107,114,128)] hover:text-brand-500">{{ link.label }}</NuxtLinkLocale>
        </div>
      </div>

      <div>
        <div class="eyebrow-strong">{{ t('footer.moreTools') }}</div>
        <div class="flex flex-col gap-[11px] pt-[18px] text-[13.5px] leading-relaxed">
          <NuxtLinkLocale v-for="link in moreToolsLinks" :key="link.to" :to="link.to" class="text-[rgb(107,114,128)] hover:text-brand-500">{{ link.label }}</NuxtLinkLocale>
        </div>
      </div>

      <div>
        <div class="eyebrow-strong">{{ t('footer.browseByAlphabet') }}</div>
        <div class="flex flex-wrap gap-x-3 gap-y-[9px] pt-[18px] text-[13px]">
          <NuxtLinkLocale v-for="letter in alphabet" :key="letter" :to="`/alphabet/${letter.toLowerCase()}`" class="text-ink-800 hover:text-brand-500">{{ letter }}</NuxtLinkLocale>
        </div>

        <div class="eyebrow-strong pt-[30px]">{{ t('footer.top1000Directory') }}</div>
        <div class="grid grid-cols-3 gap-[11px] pt-[18px] text-[13px]">
          <NuxtLinkLocale v-for="date in archiveDates" :key="date.iso" :to="`/archive/${date.iso}`" class="text-ink-800 hover:text-brand-500">{{ date.label }}</NuxtLinkLocale>
        </div>
      </div>

      <div>
        <div class="eyebrow-strong">{{ t('footer.about') }}</div>
        <div class="flex flex-col gap-[11px] pt-[18px] text-[13.5px]">
          <NuxtLinkLocale v-for="link in aboutLinks" :key="link.key" :to="link.to" class="text-ink-800 hover:text-brand-500">{{ t(`footer.${link.key}`) }}</NuxtLinkLocale>
        </div>
      </div>

      <div>
        <div class="eyebrow-strong">{{ t('footer.contact') }}</div>
        <div class="flex flex-col gap-[11px] pt-[18px] text-[13.5px]">
          <NuxtLinkLocale to="/contact" class="text-ink-800 hover:text-brand-500">{{ t('contactPage.title') }}</NuxtLinkLocale>
          <a :href="`mailto:${SUPPORT_EMAIL}`" class="text-brand-500 hover:text-brand-600">{{ SUPPORT_EMAIL }}</a>
        </div>

        <div class="flex gap-2 pt-4">
          <a
            v-for="s in SOCIAL_LINKS"
            :key="s.name"
            :href="s.url"
            :title="s.name"
            :aria-label="s.name"
            target="_blank"
            rel="noopener"
            class="inline-flex h-8 w-8 items-center justify-center rounded-[9px] border border-ink-200 text-ink-800 hover:border-brand-500 hover:text-brand-500"
          >
            <svg class="h-[15px] w-[15px]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path :d="s.icon" /></svg>
          </a>
        </div>
      </div>
    </div>

    <div class="mx-auto mt-14 flex max-w-[1440px] flex-wrap items-center justify-between gap-6 border-t border-ink-200 pt-[26px]">
      <div class="flex items-center gap-[11px]">
        <IconLogo class="h-[34px] w-[34px] rounded-[10px]" width="34" height="34" />
        <span class="text-[19px] font-extrabold tracking-[-0.02em] text-ink-900">TopAI<span class="text-brand-500">Collection</span></span>
        <span class="text-sm text-ink-600">— {{ t('footer.tagline') }}</span>
      </div>
      <div class="text-[13px] text-ink-600">© {{ year }} TopAICollection — {{ t('footer.copyright') }}</div>
    </div>

    <div class="mx-auto mt-5 flex max-w-[1440px] flex-wrap gap-x-5 gap-y-3 text-[13px]">
      <!-- Real links to this page in each language (crawlable); a click switches in place. -->
      <a
        v-for="loc in locales"
        :key="loc.code"
        :href="pathFor(loc.code)"
        :hreflang="loc.code"
        :class="loc.code === locale ? 'font-bold text-ink-900' : 'cursor-pointer text-ink-600 hover:text-brand-500'"
        @click="onLanguageClick($event, loc.code)"
      >{{ loc.name }}</a>
    </div>
  </footer>
</template>
