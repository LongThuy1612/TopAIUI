<script setup lang="ts">
import type { Category } from '~/types'

const { t, locale, locales, setLocale } = useI18n()

const year = new Date().getFullYear()

const { data: footerCategories } = await useFetch<Category[]>('/api/categories', { query: computed(() => ({ locale: locale.value })) })

const sortedFooterCategories = computed(() =>
  [...(footerCategories.value ?? [])].sort((a, b) => b.count - a.count)
)

const topAiToolsLinks = computed(() =>
  sortedFooterCategories.value
    .slice(0, 20)
    .map(cat => ({ label: `${cat.count} ${cat.name} Tools`, to: `/category/${cat.slug}` }))
)

const moreToolsLinks = computed(() =>
  sortedFooterCategories.value
    .slice(20, 35)
    .map(cat => ({ label: `${cat.name} Tools`, to: `/category/${cat.slug}` }))
)

const footerColumns = [
  {
    title: 'Recommend',
    links: [
      'Choosing AI Tools for a Five-Person Marketing Team',
      'Comparing API Costs Across Popular Models',
      'An AI-Assisted Content Production Workflow',
      'How to Quality-Check AI Translation',
      'Using AI in Support Without Losing Your Brand Voice',
      'What to Delegate to AI — and What Not To'
    ]
  }
]

const resourceLinks = ['Blog', 'AI News', 'Prompts','Weekly Newsletter']
const aboutLinks = ['About Us', 'Terms of Service', 'Privacy Policy', 'Advertise']
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
        <div class="eyebrow-strong">Top AI Tools</div>
        <div class="flex flex-col gap-[11px] pt-[18px] text-[13.5px] leading-relaxed">
          <NuxtLink v-for="link in topAiToolsLinks" :key="link.to" :to="link.to" class="text-[rgb(107,114,128)] hover:text-brand-500">{{ link.label }}</NuxtLink>
        </div>
      </div>

      <div>
        <div class="eyebrow-strong">More Tools</div>
        <div class="flex flex-col gap-[11px] pt-[18px] text-[13.5px] leading-relaxed">
          <NuxtLink v-for="link in moreToolsLinks" :key="link.to" :to="link.to" class="text-[rgb(107,114,128)] hover:text-brand-500">{{ link.label }}</NuxtLink>
        </div>
      </div>

      <div v-for="col in footerColumns" :key="col.title">
        <div class="eyebrow-strong">{{ col.title }}</div>
        <div class="flex flex-col gap-[11px] pt-[18px] text-[13.5px] leading-relaxed">
          <a v-for="link in col.links" :key="link" href="#" class="text-ink-800 hover:text-brand-500">{{ link }}</a>
        </div>
      </div>

      <div>
        <div class="eyebrow-strong">Resource</div>
        <div class="flex flex-col gap-[11px] pt-[18px] text-[13.5px]">
          <NuxtLink to="/ranking" class="text-ink-800 hover:text-brand-500">Ranking</NuxtLink>
          <a v-for="link in resourceLinks" :key="link" href="#" class="text-ink-800 hover:text-brand-500">{{ link }}</a>
        </div>

        <div class="eyebrow pt-[30px]">Browse by Alphabet</div>
        <div class="flex flex-wrap gap-x-3 gap-y-[9px] pt-4 text-[13px]">
          <a v-for="letter in alphabet" :key="letter" href="#" class="text-ink-800 hover:text-brand-500">{{ letter }}</a>
        </div>

        <div class="eyebrow pt-[30px]">Top 1000 AI Tools Directory</div>
        <div class="grid grid-cols-3 gap-[11px] pt-4 text-[13px]">
          <NuxtLink v-for="date in archiveDates" :key="date.iso" :to="`/archive/${date.iso}`" class="text-ink-800 hover:text-brand-500">{{ date.label }}</NuxtLink>
        </div>
      </div>

      <div>
        <div class="eyebrow-strong">About</div>
        <div class="flex flex-col gap-[11px] pt-[18px] text-[13.5px]">
          <NuxtLink to="/submit" class="text-ink-800 hover:text-brand-500">{{ t('footer.submit') }}</NuxtLink>
          <a v-for="link in aboutLinks" :key="link" href="#" class="text-ink-800 hover:text-brand-500">{{ link }}</a>
        </div>

        <div class="eyebrow pt-[30px]">Contact</div>
        <div class="pt-4 text-[13.5px]"><a href="mailto:hello@topaicollection.com" class="text-brand-500 hover:text-brand-600">hello@topaicollection.com</a></div>

        <div class="flex gap-2 pt-4">
          <a href="#" class="inline-flex h-8 w-8 items-center justify-center rounded-[9px] border border-ink-200 text-[13px] font-bold text-ink-800 hover:border-brand-500 hover:text-brand-500">X</a>
          <a href="#" class="inline-flex h-8 w-8 items-center justify-center rounded-[9px] border border-ink-200 text-[13px] font-bold text-ink-800 hover:border-brand-500 hover:text-brand-500">in</a>
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
      <button
        v-for="loc in locales"
        :key="loc.code"
        type="button"
        :class="loc.code === locale ? 'font-bold text-ink-900' : 'cursor-pointer text-ink-600 hover:text-brand-500'"
        @click="setLocale(loc.code)"
      >{{ loc.name }}</button>
    </div>
  </footer>
</template>
