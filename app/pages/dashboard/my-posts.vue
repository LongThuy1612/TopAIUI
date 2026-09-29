<script setup lang="ts">
const { t } = useI18n()
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const credits = 0

useSeoMeta({
  title: () => `${t('myPostsPage.title')} — TopAICollection`
})
</script>

<template>
  <div>
    <h1 class="text-xl font-extrabold text-ink-900">{{ t('myPostsPage.title') }}</h1>

    <div class="mt-4 flex flex-wrap items-center gap-3">
      <a href="#" class="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
        {{ t('myPostsPage.createNewPost') }}
      </a>
      <a href="#" class="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
        {{ t('myPostsPage.createNewLinkInsert') }}
      </a>
      <span class="text-sm text-ink-900">
        <span class="font-bold">{{ t('myPostsPage.myCredits') }}: {{ credits }}</span>
        {{ t('myPostsPage.creditsHint') }}
      </span>
      <a href="#" class="rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-900 hover:border-brand-300">
        {{ t('myPostsPage.buyMore') }}
      </a>
    </div>

    <div class="mt-5 overflow-x-auto rounded-xl border border-ink-100">
      <table class="w-full min-w-[700px] text-left text-sm">
        <thead class="bg-ink-100/40 text-xs font-bold uppercase tracking-wide text-ink-900">
          <tr>
            <th class="px-4 py-3">{{ t('myPostsPage.colPost') }}</th>
            <th class="px-4 py-3">{{ t('myPostsPage.colArticleLink') }}</th>
            <th class="px-4 py-3">{{ t('myPostsPage.colType') }}</th>
            <th class="px-4 py-3">{{ t('myPostsPage.colStatus') }}</th>
          </tr>
        </thead>
      </table>

      <div class="flex flex-col items-center gap-4 py-16">
        <p class="text-sm text-ink-900">{{ t('myPostsPage.emptyMessage') }}</p>
        <div class="flex flex-wrap justify-center gap-3">
          <a href="#" class="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
            {{ t('myPostsPage.createNewPost') }}
          </a>
          <a href="#" class="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
            {{ t('myPostsPage.createNewLinkInsert') }}
          </a>
        </div>
      </div>
    </div>
  </div>
</template>
