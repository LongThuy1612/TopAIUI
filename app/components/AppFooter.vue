<script setup lang="ts">
const { t, locale, locales, setLocale } = useI18n()

const year = new Date().getFullYear()

const footerColumns = [
  {
    title: 'Top AI Tools',
    links: [
      '10 Speech-to-Text Tools for Effortless Transcription',
      '7 Copywriting Tools for Social Commerce Pages',
      '13 Product Photo Generators for Online Stores',
      '9 AI Assistants That Clear Your Inbox Faster',
      '12 Tools for Building Short-Form Video',
      '6 Subtitle Translators That Keep Context Intact',
      '8 Coding Assistants That Hold Up in Real Projects',
      '11 Tools for Summarizing Long Documents',
      '14 Tools for Automated Customer Support',
      '10 No-Code Data Analysis Tools'
    ]
  },
  {
    title: 'More Tools',
    links: [
      'ai content writing', 'text to image generator', 'chatbot for facebook page',
      'remove image background online', 'automatic subtitle translation', 'document to slides',
      'ai voice over', 'product description writer', 'ai review code', 'youtube video summary'
    ]
  },
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

const resourceLinks = ['Blog', 'AI News', 'Prompts', 'AI Jobs', 'Weekly Newsletter']
const aboutLinks = ['About Us', 'Terms of Service', 'Privacy Policy', 'Advertise']
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const archiveDates = ['09/10', '09/09', '09/08', '09/07', '09/04', '09/03', '09/02', '09/01', '08/31']
</script>

<template>
  <footer class="w-full border-t border-ink-200 bg-white px-4 pt-[72px] pb-9 sm:px-6 lg:px-8">
    <div class="mx-auto grid max-w-7xl grid-cols-[repeat(auto-fit,minmax(205px,1fr))] items-start gap-11">

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
          <a v-for="date in archiveDates" :key="date" href="#" class="text-ink-800 hover:text-brand-500">{{ date }}</a>
        </div>
      </div>

      <div>
        <div class="eyebrow-strong">About</div>
        <div class="flex flex-col gap-[11px] pt-[18px] text-[13.5px]">
          <NuxtLink to="/submit" class="text-ink-800 hover:text-brand-500">{{ t('footer.submit') }}</NuxtLink>
          <a v-for="link in aboutLinks" :key="link" href="#" class="text-ink-800 hover:text-brand-500">{{ link }}</a>
          <NuxtLink to="/admin/login" class="text-ink-800 hover:text-brand-500">{{ t('footer.admin') }}</NuxtLink>
        </div>

        <div class="eyebrow pt-[30px]">Contact</div>
        <div class="pt-4 text-[13.5px]"><a href="mailto:hello@topaicollection.com" class="text-brand-500 hover:text-brand-600">hello@topaicollection.com</a></div>

        <div class="flex gap-2 pt-4">
          <a href="#" class="inline-flex h-8 w-8 items-center justify-center rounded-[9px] border border-ink-200 text-[13px] font-bold text-ink-800 hover:border-brand-500 hover:text-brand-500">X</a>
          <a href="#" class="inline-flex h-8 w-8 items-center justify-center rounded-[9px] border border-ink-200 text-[13px] font-bold text-ink-800 hover:border-brand-500 hover:text-brand-500">in</a>
        </div>
      </div>
    </div>

    <div class="mx-auto mt-14 flex max-w-7xl flex-wrap items-center justify-between gap-6 border-t border-ink-200 pt-[26px]">
      <div class="flex items-center gap-[11px]">
        <IconLogo class="h-[34px] w-[34px] rounded-[10px]" width="34" height="34" />
        <span class="text-[19px] font-extrabold tracking-[-0.02em] text-ink-900">TopAI<span class="text-brand-500">Collection</span></span>
        <span class="text-sm text-ink-600">— {{ t('footer.tagline') }}</span>
      </div>
      <div class="text-[13px] text-ink-600">© {{ year }} TopAICollection — {{ t('footer.copyright') }}</div>
    </div>

    <div class="mx-auto mt-5 flex max-w-7xl flex-wrap gap-x-5 gap-y-3 text-[13px]">
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
