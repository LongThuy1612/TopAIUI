<script setup lang="ts">
const { t } = useI18n()
const { token, load } = useAdminAuth()
load()

if (import.meta.client && !token.value) {
  await navigateTo('/admin/login')
}

useSeoMeta({
  title: () => `${t('myAIsPage.title')} — TopAICollection`
})
</script>

<template>
  <div class="flex min-h-[calc(100vh-64px)] w-full">
    <AdminSidebar />

    <div class="min-w-0 flex-1 px-6 py-6 lg:px-8">
      <h1 class="text-xl font-extrabold text-ink-900">{{ t('myAIsPage.title') }}</h1>

      <div class="mt-4 flex flex-wrap gap-3">
        <NuxtLink to="/submit" class="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
          {{ t('myAIsPage.submitNewAI') }}
        </NuxtLink>
        <NuxtLink to="/submit" class="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
          {{ t('myAIsPage.updateNewAI') }}
        </NuxtLink>
      </div>

      <div class="mt-5 overflow-x-auto rounded-xl border border-ink-100">
        <table class="w-full min-w-[700px] text-left text-sm">
          <thead class="bg-ink-100/40 text-xs font-bold uppercase tracking-wide text-ink-900">
            <tr>
              <th class="px-4 py-3">{{ t('myAIsPage.colTool') }}</th>
              <th class="px-4 py-3">{{ t('myAIsPage.colWebsite') }}</th>
              <th class="px-4 py-3">{{ t('myAIsPage.colType') }}</th>
              <th class="px-4 py-3">{{ t('myAIsPage.colDate') }}</th>
              <th class="px-4 py-3">{{ t('myAIsPage.colStatus') }}</th>
              <th class="px-4 py-3">{{ t('myAIsPage.colAction') }}</th>
            </tr>
          </thead>
        </table>

        <div class="flex flex-col items-center gap-4 py-16">
          <p class="text-sm text-ink-900">{{ t('myAIsPage.emptyMessage') }}</p>
          <NuxtLink to="/submit" class="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
            {{ t('myAIsPage.submitYourTool') }}
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
