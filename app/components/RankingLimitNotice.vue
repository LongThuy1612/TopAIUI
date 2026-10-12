<script setup lang="ts">
// End of the ranking for guests and Free users (server: /api/ranking limitedTo).
defineProps<{ limit: number }>()
const { t } = useI18n()
const route = useRoute()
const { token, load } = useAuth()
onMounted(load)
</script>

<template>
  <div class="my-6 rounded-xl border border-brand-100 bg-brand-50/60 px-5 py-6 text-center">
    <p class="font-semibold text-ink-900">{{ t('publicLimits.rankingTitle', { n: limit }) }}</p>
    <p class="mt-1 text-sm text-ink-600">{{ t('publicLimits.rankingText') }}</p>
    <NuxtLinkLocale
      v-if="token"
      :to="{ path: '/dashboard', query: { upgrade: '1' } }"
      class="mt-4 inline-block rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
    >{{ t('admin.upgrade') }}</NuxtLinkLocale>
    <NuxtLinkLocale
      v-else
      :to="{ path: '/login', query: { redirect: route.fullPath } }"
      class="mt-4 inline-block rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
    >{{ t('publicLimits.login') }}</NuxtLinkLocale>
  </div>
</template>
