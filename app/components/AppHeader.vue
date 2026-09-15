<script setup lang="ts">
const { t } = useI18n()
const { token, load } = useAdminAuth()
load()

const rankingMenuOpen = ref(false)
let closeTimer: ReturnType<typeof setTimeout> | null = null

function openRankingMenu() {
  if (closeTimer) { clearTimeout(closeTimer); closeTimer = null }
  rankingMenuOpen.value = true
}

function scheduleCloseRankingMenu() {
  closeTimer = setTimeout(() => { rankingMenuOpen.value = false }, 120)
}

const rankingItems = [
  {
    to: '/ranking',
    icon: 'M6 3.75A1.75 1.75 0 0 1 7.75 2h8.5A1.75 1.75 0 0 1 18 3.75v.5h.25A1.75 1.75 0 0 1 20 6v12.25A1.75 1.75 0 0 1 18.25 20H5.75A1.75 1.75 0 0 1 4 18.25V6a1.75 1.75 0 0 1 1.75-1.75H6v-.5ZM7.5 4.25v.5h5v-.5h-5ZM6 12h5v1.5H6V12Zm0 3.5h8V17H6v-1.5ZM6 8.5h8V10H6V8.5Z',
    titleKey: 'rankingMenu.monthlyTitle',
    descKey: 'rankingMenu.monthlyDesc'
  },
  {
    to: '/ranking/categories',
    icon: 'M11.42 2.13a1 1 0 0 1 1.16 0l8 5.7a1 1 0 0 1 0 1.63l-8 5.7a1 1 0 0 1-1.16 0l-8-5.7a1 1 0 0 1 0-1.63l8-5.7Zm-6.2 10.6 6.2 4.42a1 1 0 0 0 1.16 0l6.2-4.42 1.64 1.17a1 1 0 0 1 0 1.63l-8 5.7a1 1 0 0 1-1.16 0l-8-5.7a1 1 0 0 1 0-1.63l1.96-1.17Z',
    titleKey: 'rankingMenu.categoriesTitle',
    descKey: 'rankingMenu.categoriesDesc'
  },
  {
    to: '/ranking/regions',
    icon: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm6.93 6h-3.05a15.6 15.6 0 0 0-1.25-3.66A8.03 8.03 0 0 1 18.93 8ZM12 4.06c.7 1.06 1.27 2.35 1.63 3.94h-3.26c.36-1.59.93-2.88 1.63-3.94ZM4.26 14a8.14 8.14 0 0 1 0-4h3.5a16.7 16.7 0 0 0 0 4h-3.5Zm.81 2h3.05c.3 1.36.72 2.6 1.25 3.66A8.03 8.03 0 0 1 5.07 16Zm3.05-8H5.07a8.03 8.03 0 0 1 4.3-3.66A15.6 15.6 0 0 0 8.12 8ZM12 19.94c-.7-1.06-1.27-2.35-1.63-3.94h3.26c-.36 1.59-.93 2.88-1.63 3.94ZM13.87 14h-3.74a14.7 14.7 0 0 1 0-4h3.74a14.7 14.7 0 0 1 0 4Zm.4 5.66c.53-1.06.95-2.3 1.25-3.66h3.05a8.03 8.03 0 0 1-4.3 3.66ZM16.24 14a16.7 16.7 0 0 0 0-4h3.5a8.14 8.14 0 0 1 0 4h-3.5Z',
    titleKey: 'rankingMenu.regionsTitle',
    descKey: 'rankingMenu.regionsDesc'
  },
  {
    to: '/ranking/source',
    icon: 'M4 13h3v7H4v-7Zm6.5-5h3v12h-3V8Zm6.5 8h3v4h-3v-4Z',
    titleKey: 'rankingMenu.sourceTitle',
    descKey: 'rankingMenu.sourceDesc'
  },
  {
    to: '/ranking/revenue',
    icon: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm.75 15.5v1h-1.5v-1.02c-1.28-.19-2.32-.9-2.75-2.02l1.4-.58c.28.68.9 1.1 1.85 1.1.86 0 1.4-.36 1.4-.94 0-.6-.5-.83-1.7-1.14-1.6-.4-2.75-.95-2.75-2.45 0-1.16.9-2 2.15-2.24V7.5h1.5v1.2c1.1.2 1.95.85 2.3 1.83l-1.38.58c-.24-.56-.78-.9-1.52-.9-.75 0-1.25.32-1.25.85 0 .54.5.75 1.65 1.05 1.66.43 2.8 1 2.8 2.5 0 1.24-.95 2.15-2.2 2.39Z',
    titleKey: 'rankingMenu.revenueTitle',
    descKey: 'rankingMenu.revenueDesc'
  }
]
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-ink-200 bg-white/90 backdrop-blur">
    <div class="mx-auto flex h-[72px] max-w-[1440px] items-center gap-[30px] px-4 sm:px-6 lg:px-8">
      <NuxtLink to="/" class="flex shrink-0 items-center gap-2.5">
        <IconLogo class="h-[30px] w-[30px] rounded-[9px]" width="30" height="30" />
        <span class="text-[22px] font-extrabold tracking-[-0.02em] text-ink-900">TopAI<span class="text-brand-500">Collection</span></span>
      </NuxtLink>

      <nav class="hidden shrink-0 items-center gap-1 lg:flex">
        <NuxtLink to="/category/all?pricing=FREE" class="rounded-lg px-3 py-2 text-sm font-semibold text-ink-800 hover:text-brand-500">
          {{ t('header.freeTools') }}
        </NuxtLink>
        <a href="#" class="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-ink-800 hover:text-brand-500">
          {{ t('header.products') }}
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 20 20" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="m5 7.5 5 5 5-5" />
          </svg>
        </a>
        <NuxtLink to="/category/all" class="rounded-lg px-3 py-2 text-sm font-semibold text-ink-800 hover:text-brand-500">
          {{ t('header.categories') }}
        </NuxtLink>

        <div class="relative" @mouseenter="openRankingMenu" @mouseleave="scheduleCloseRankingMenu">
          <NuxtLink
            to="/ranking"
            class="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-ink-800 hover:text-brand-500"
            :class="rankingMenuOpen && 'text-brand-500'"
          >
            {{ t('header.rankings') }}
            <svg class="h-3.5 w-3.5 transition-transform" :class="rankingMenuOpen && 'rotate-180'" fill="none" viewBox="0 0 20 20" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="m5 7.5 5 5 5-5" />
            </svg>
          </NuxtLink>

          <div
            v-if="rankingMenuOpen"
            class="absolute left-0 top-full w-[360px] rounded-2xl border border-ink-100 bg-white p-2 shadow-[0_16px_40px_-16px_rgba(23,18,26,.25)]"
          >
            <NuxtLink
              v-for="item in rankingItems"
              :key="item.to"
              :to="item.to"
              class="flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-ink-100/60"
              @click="rankingMenuOpen = false"
            >
              <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500">
                <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path :d="item.icon" /></svg>
              </span>
              <span class="min-w-0">
                <span class="block text-sm font-bold text-ink-900">{{ t(item.titleKey) }}</span>
                <span class="mt-0.5 block text-xs leading-snug text-ink-500">{{ t(item.descKey) }}</span>
              </span>
            </NuxtLink>
          </div>
        </div>

        <a href="#" class="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-ink-800 hover:text-brand-500">
          {{ t('header.prompts') }}
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 20 20" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="m5 7.5 5 5 5-5" />
          </svg>
        </a>
        <a href="#" class="rounded-lg px-3 py-2 text-sm font-semibold text-ink-800 hover:text-brand-500">
          {{ t('header.jobs') }}
        </a>
        <a href="#" class="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-ink-800 hover:text-brand-500">
          {{ t('header.resource') }}
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 20 20" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="m5 7.5 5 5 5-5" />
          </svg>
        </a>
        <NuxtLink to="/submit" class="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-ink-800 hover:text-brand-500">
          {{ t('header.submit') }}
        </NuxtLink>
        <a href="#" class="rounded-lg px-3 py-2 text-sm font-semibold text-ink-800 hover:text-brand-500">
          {{ t('header.adLibrary') }}
        </a>
      </nav>

      <nav class="ml-auto flex shrink-0 items-center gap-4">
        <LanguageSwitcher class="hidden sm:block" />
        <NuxtLink
          :to="token ? '/admin' : '/admin/login'"
          class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          {{ t('header.admin') }}
        </NuxtLink>
      </nav>
    </div>
  </header>
</template>
