<script setup lang="ts">
const { t } = useI18n()
const { token, load } = useAdminAuth()
load()

if (import.meta.client && !token.value) {
  await navigateTo('/admin/login')
}

useSeoMeta({
  title: () => `${t('myGPTsPage.title')} — TopAICollection`
})
</script>

<template>
  <div class="flex min-h-[calc(100vh-64px)] w-full">
    <AdminSidebar />

    <div class="min-w-0 flex-1 px-6 py-6 lg:px-8">
      <h1 class="text-xl font-extrabold text-ink-900">{{ t('myGPTsPage.title') }}</h1>

      <div class="mt-4">
        <a href="#" class="inline-block rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
          {{ t('myGPTsPage.submitNewGPT') }}
        </a>
      </div>

      <div class="mt-5 overflow-x-auto rounded-xl border border-ink-100">
        <table class="w-full min-w-[500px] text-left text-sm">
          <thead class="bg-ink-100/40 text-xs font-bold uppercase tracking-wide text-ink-900">
            <tr>
              <th class="px-4 py-3">{{ t('myGPTsPage.colTool') }}</th>
              <th class="px-4 py-3">{{ t('myGPTsPage.colDate') }}</th>
              <th class="px-4 py-3">{{ t('myGPTsPage.colStatus') }}</th>
            </tr>
          </thead>
        </table>

        <div class="flex flex-col items-center gap-4 py-16">
          <p class="text-sm text-ink-900">{{ t('myGPTsPage.emptyMessage') }}</p>
          <a href="#" class="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
            {{ t('myGPTsPage.submitYourGPT') }}
          </a>
        </div>
      </div>
    </div>
  </div>
</template>
