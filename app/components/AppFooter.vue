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
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

const resourceLinks = [
  { key: 'help', to: '/help' },
  { key: 'editorialGuidelines', to: '/editorial-guidelines' },
  { key: 'reviewMethodology', to: '/review-methodology' },
  { key: 'terms', to: '/terms' },
  { key: 'cookies', to: '/cookies' }
]
const aboutLinks = [
  { key: 'aboutUs', to: '/about' },
  { key: 'pricing', to: '/pricing' },
  { key: 'faq', to: '/faq' },
  { key: 'privacy', to: '/privacy' },
  { key: 'contact', to: '/contact' }
]
</script>

<template>
  <footer class="w-full border-t border-ink-100 bg-[#FAFAFB] px-4 pt-12 pb-8 sm:px-6 lg:px-10">
    <div class="mx-auto grid max-w-[1352px] grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-10 text-[13px] text-ink-700">
      <div class="flex flex-col gap-3">
        <NuxtLinkLocale to="/" class="flex items-center gap-2.5 text-base font-bold text-ink-900">
          <IconLogo class="h-7 w-7" width="28" height="28" />
          TopAICollection
        </NuxtLinkLocale>
        <span class="max-w-[260px] leading-relaxed">{{ t('footer.tagline') }}</span>
        <a :href="`mailto:${SUPPORT_EMAIL}`" class="hover:text-ink-900">{{ SUPPORT_EMAIL }}</a>
        <div class="flex gap-2 pt-1">
          <a
            v-for="social in SOCIAL_LINKS"
            :key="social.name"
            :href="social.url"
            :title="social.name"
            :aria-label="social.name"
            target="_blank"
            rel="noopener"
            class="grid h-8 w-8 place-items-center rounded-lg border border-ink-200 bg-white text-ink-800 transition-colors hover:border-ink-400 hover:text-ink-900"
          >
            <svg class="h-[15px] w-[15px]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path :d="social.icon" /></svg>
          </a>
        </div>
      </div>

      <div class="flex flex-col gap-2.5">
        <span class="font-bold text-ink-900">{{ t('footer.browseByAlphabet') }}</span>
        <div class="grid max-w-[232px] grid-cols-[repeat(auto-fill,28px)] gap-1.5">
          <NuxtLinkLocale
            v-for="letter in alphabet"
            :key="letter"
            :to="`/alphabet/${letter.toLowerCase()}`"
            class="grid h-7 w-7 place-items-center rounded-lg bg-white text-xs font-semibold text-ink-800 hover:text-brand-600"
          >{{ letter }}</NuxtLinkLocale>
        </div>
      </div>

      <div class="flex flex-col gap-2.5">
        <span class="font-bold text-ink-900">{{ t('footer.resources') }}</span>
        <NuxtLinkLocale v-for="link in resourceLinks" :key="link.key" :to="link.to" class="hover:text-ink-900">{{ t(`footer.${link.key}`) }}</NuxtLinkLocale>
      </div>

      <div class="flex flex-col gap-2.5">
        <span class="font-bold text-ink-900">{{ t('footer.about') }}</span>
        <NuxtLinkLocale v-for="link in aboutLinks" :key="link.key" :to="link.to" class="hover:text-ink-900">{{ t(`footer.${link.key}`) }}</NuxtLinkLocale>
      </div>
    </div>

    <div class="mx-auto mt-8 flex max-w-[1352px] flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-5 text-xs text-ink-400">
      <span>© {{ year }} TopAICollection — {{ t('footer.copyright') }}</span>
      <!-- Real links to this page in each language (crawlable); a click switches in place. -->
      <span class="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        <template v-for="(loc, i) in locales" :key="loc.code">
          <span v-if="i" aria-hidden="true">·</span>
          <a
            :href="pathFor(loc.code)"
            :hreflang="loc.code"
            :class="loc.code === locale ? 'font-semibold text-ink-800' : 'cursor-pointer hover:text-ink-800'"
            @click="onLanguageClick($event, loc.code)"
          >{{ loc.name }}</a>
        </template>
      </span>
    </div>
  </footer>
</template>
