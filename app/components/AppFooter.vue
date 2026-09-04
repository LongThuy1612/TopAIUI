<script setup lang="ts">
import type { Category } from '~/types'

const { t } = useI18n()
const { data: categories } = await useFetch<Category[]>('/api/categories')

const year = new Date().getFullYear()
</script>

<template>
  <footer class="border-t border-ink-100 bg-ink-900 pt-12 text-ink-400">
    <div class="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 sm:grid-cols-4 sm:px-6 lg:px-8">
      <div class="col-span-2 sm:col-span-1">
        <NuxtLink to="/" class="flex items-center gap-2">
          <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-xs font-extrabold text-white">T</span>
          <span class="text-base font-extrabold tracking-tight text-white">Topainew</span>
        </NuxtLink>
        <p class="mt-3 max-w-[220px] text-sm leading-relaxed">{{ t('footer.tagline') }}</p>
        <div class="mt-4">
          <LanguageSwitcher />
        </div>
      </div>

      <div>
        <h3 class="text-xs font-semibold uppercase tracking-wide text-ink-200">{{ t('footer.product') }}</h3>
        <ul class="mt-3 space-y-2 text-sm">
          <li><NuxtLink to="/" class="hover:text-white">{{ t('footer.home') }}</NuxtLink></li>
          <li><NuxtLink to="/category/all" class="hover:text-white">{{ t('footer.allTools') }}</NuxtLink></li>
          <li><NuxtLink to="/submit" class="hover:text-white">{{ t('footer.submit') }}</NuxtLink></li>
        </ul>
      </div>

      <div>
        <h3 class="text-xs font-semibold uppercase tracking-wide text-ink-200">{{ t('footer.categories') }}</h3>
        <ul class="mt-3 space-y-2 text-sm">
          <li v-for="cat in categories?.slice(0, 5)" :key="cat.slug">
            <NuxtLink :to="`/category/${cat.slug}`" class="hover:text-white">{{ cat.icon }} {{ cat.name }}</NuxtLink>
          </li>
        </ul>
      </div>

      <div>
        <h3 class="text-xs font-semibold uppercase tracking-wide text-ink-200">{{ t('footer.company') }}</h3>
        <ul class="mt-3 space-y-2 text-sm">
          <li><NuxtLink to="/admin/login" class="hover:text-white">{{ t('footer.admin') }}</NuxtLink></li>
        </ul>
      </div>
    </div>

    <div class="mt-10 border-t border-white/10 py-6 text-center text-xs">
      © {{ year }} Topainew — {{ t('footer.copyright') }}
    </div>
  </footer>
</template>
