<script setup lang="ts">
const { t } = useI18n()
const { token, load } = useAdminAuth()
load()

function onSearch(q: string) {
  navigateTo({ path: '/category/all', query: q ? { q } : {} })
}
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-ink-200 bg-white/90 backdrop-blur">
    <div class="mx-auto flex h-[72px] max-w-7xl items-center gap-[30px] px-4 sm:px-6 lg:px-8">
      <NuxtLink to="/" class="flex shrink-0 items-center gap-2.5">
        <IconLogo class="h-[30px] w-[30px] rounded-[9px]" width="30" height="30" />
        <span class="text-[22px] font-extrabold tracking-[-0.02em] text-ink-900">TopAI<span class="text-brand-500">Collection</span></span>
      </NuxtLink>

      <nav class="hidden shrink-0 items-center gap-1 lg:flex">
        <NuxtLink to="/category/all" class="rounded-lg px-3 py-2 text-sm font-semibold text-ink-800 hover:text-brand-500">
          {{ t('header.categories') }}
        </NuxtLink>
        <NuxtLink to="/ranking" class="rounded-lg px-3 py-2 text-sm font-semibold text-ink-800 hover:text-brand-500">
          {{ t('header.rankings') }}
        </NuxtLink>
      </nav>

      <div class="hidden max-w-sm flex-1 md:block">
        <SearchBar :placeholder="t('header.searchPlaceholder')" dense @submit="onSearch" />
      </div>

      <nav class="ml-auto flex shrink-0 items-center gap-4">
        <LanguageSwitcher class="hidden sm:block" />
        <NuxtLink
          v-if="!token"
          to="/admin/login"
          class="text-sm font-semibold text-ink-800 hover:text-brand-500"
        >
          {{ t('header.admin') }}
        </NuxtLink>
      </nav>
    </div>
  </header>
</template>
