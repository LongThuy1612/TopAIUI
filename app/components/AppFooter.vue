<script setup lang="ts">
const { t } = useI18n()

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
const languages = ['English', 'Tiếng Việt', '简体中文', '日本語', '한국어', 'Português', 'Español', 'Deutsch', 'Français']
</script>

<template>
  <footer class="w-full border-t border-ink-200 bg-white px-4 pt-16 pb-10 sm:px-6 lg:px-8">
    <div class="mx-auto grid max-w-7xl grid-cols-[repeat(auto-fit,minmax(210px,1fr))] items-start gap-10">

      <div v-for="col in footerColumns" :key="col.title">
        <div class="text-[19px] font-extrabold text-ink-900">{{ col.title }}</div>
        <div class="flex flex-col gap-3 pt-[18px] text-sm leading-normal">
          <a v-for="link in col.links" :key="link" href="#" class="text-brand-500 hover:text-brand-600">{{ link }}</a>
        </div>
      </div>

      <div>
        <div class="text-[19px] font-extrabold text-ink-900">Resource</div>
        <div class="flex flex-col gap-3 pt-[18px] text-sm">
          <NuxtLink to="/ranking" class="text-brand-500 hover:text-brand-600">Ranking</NuxtLink>
          <a v-for="link in resourceLinks" :key="link" href="#" class="text-brand-500 hover:text-brand-600">{{ link }}</a>
        </div>

        <div class="pt-[30px] text-[19px] font-extrabold text-ink-900">Browse by Alphabet</div>
        <div class="flex flex-wrap gap-x-3 gap-y-2.5 pt-4 text-sm">
          <a v-for="letter in alphabet" :key="letter" href="#" class="text-brand-500 hover:text-brand-600">{{ letter }}</a>
        </div>

        <div class="pt-[30px] text-[19px] font-extrabold text-ink-900">Top 1000 AI Tools Directory</div>
        <div class="grid grid-cols-3 gap-3 pt-4 text-sm">
          <a v-for="date in archiveDates" :key="date" href="#" class="text-brand-500 hover:text-brand-600">{{ date }}</a>
        </div>
      </div>

      <div>
        <div class="text-[19px] font-extrabold text-ink-900">About</div>
        <div class="flex flex-col gap-3 pt-[18px] text-sm">
          <NuxtLink to="/submit" class="text-brand-500 hover:text-brand-600">{{ t('footer.submit') }}</NuxtLink>
          <a v-for="link in aboutLinks" :key="link" href="#" class="text-brand-500 hover:text-brand-600">{{ link }}</a>
          <NuxtLink to="/admin/login" class="text-brand-500 hover:text-brand-600">{{ t('footer.admin') }}</NuxtLink>
        </div>

        <div class="pt-[30px] text-[19px] font-extrabold text-ink-900">Contact Us</div>
        <div class="pt-4 text-sm"><a href="mailto:hello@topaicollection.com" class="text-brand-500 hover:text-brand-600">hello@topaicollection.com</a></div>

        <div class="flex gap-2.5 pt-4">
          <a href="#" class="inline-flex h-[30px] w-[30px] items-center justify-center rounded-full bg-ink-900 text-[13px] font-bold text-white">X</a>
          <a href="#" class="inline-flex h-[30px] w-[30px] items-center justify-center rounded-full bg-ink-600 text-[13px] font-bold text-white">t</a>
        </div>
      </div>
    </div>

    <div class="mx-auto mt-14 max-w-7xl">
      <div class="flex items-center gap-3">
        <span class="inline-flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,#db2777,#e11d48)] text-[15px] font-extrabold text-white">T</span>
        <span class="text-[26px] font-extrabold tracking-[-0.02em] text-ink-900">TopAI<span class="text-brand-500">Collection</span></span>
      </div>
      <p class="mt-3.5 text-[15px] font-semibold text-ink-600">{{ t('footer.tagline') }}</p>
      <div class="flex flex-wrap gap-x-[22px] gap-y-3.5 pt-[22px] text-sm">
        <a
          v-for="(lang, i) in languages"
          :key="lang"
          href="#"
          :class="i === 0 ? 'font-bold text-brand-500' : 'text-ink-600'"
        >{{ lang }}</a>
      </div>
      <div class="pt-[26px] text-sm text-ink-500">© {{ year }} TopAICollection — {{ t('footer.copyright') }}</div>
    </div>
  </footer>
</template>
