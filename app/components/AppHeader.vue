<script setup lang="ts">
import type { Category } from '~/types'

const { t } = useI18n()
const { data: categories } = await useFetch<Category[]>('/api/categories')

const categoriesOpen = ref(false)

function onSearch(q: string) {
  navigateTo({ path: '/category/all', query: q ? { q } : {} })
}
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-ink-100 bg-white/90 backdrop-blur">
    <div class="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
      <NuxtLink to="/" class="flex shrink-0 items-center gap-2">
        <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-sm font-extrabold text-white">T</span>
        <span class="text-lg font-extrabold tracking-tight text-ink-900">TopAICollection</span>
      </NuxtLink>

      <nav class="hidden shrink-0 items-center gap-1 lg:flex">
        <div class="relative" @mouseenter="categoriesOpen = true" @mouseleave="categoriesOpen = false">
          <button class="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100/60 hover:text-brand-600">
            {{ t('header.categories') }}
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div
            v-show="categoriesOpen"
            class="absolute left-0 top-full grid w-[420px] grid-cols-2 gap-1 rounded-xl border border-ink-100 bg-white p-3 shadow-lg"
          >
            <NuxtLink
              v-for="cat in categories"
              :key="cat.slug"
              :to="`/category/${cat.slug}`"
              class="flex items-center gap-2 truncate rounded-lg px-3 py-2 text-sm text-ink-600 hover:bg-brand-50 hover:text-brand-700"
            >
              <span>{{ cat.icon }}</span>
              <span class="truncate">{{ cat.name }}</span>
            </NuxtLink>
          </div>
        </div>
        <NuxtLink to="/ranking" class="rounded-lg px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100/60 hover:text-brand-600">
          {{ t('header.rankings') }}
        </NuxtLink>
      </nav>

      <div class="hidden max-w-sm flex-1 md:block">
        <SearchBar :placeholder="t('header.searchPlaceholder')" dense @submit="onSearch" />
      </div>

      <nav class="ml-auto flex shrink-0 items-center gap-3">
        <LanguageSwitcher class="hidden sm:block" />
        <NuxtLink to="/submit" class="hidden text-sm font-medium text-ink-600 hover:text-brand-600 sm:block">
          {{ t('header.submit') }}
        </NuxtLink>
        <NuxtLink to="/admin/login" class="rounded-full border border-ink-200 px-3 py-1.5 text-sm font-semibold text-ink-600 hover:border-brand-300 hover:text-brand-600">
          {{ t('header.admin') }}
        </NuxtLink>
      </nav>
    </div>
  </header>
</template>
