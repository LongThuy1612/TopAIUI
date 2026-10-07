<script setup lang="ts">
const { t, locale } = useI18n()
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const { data, pending, error } = await useMyOrders()

// A GPT submission is a submit-gpt order; once paid it waits for an admin.
const gpts = computed(() => (data.value?.orders ?? []).filter(o => o.type === 'submit-gpt'))

const date = (iso: string) => new Date(iso).toLocaleDateString(locale.value, { year: 'numeric', month: 'short', day: 'numeric' })

useSeoMeta({
  title: () => `${t('myGPTsPage.title')} — TopAICollection`
})
</script>

<template>
  <div>
    <h1 class="text-xl font-extrabold text-ink-900">{{ t('myGPTsPage.title') }}</h1>

    <div class="mt-4">
      <NuxtLink to="/submit-gpt" class="inline-block rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
        {{ t('myGPTsPage.submitNewGPT') }}
      </NuxtLink>
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
        <tbody v-if="gpts.length" class="divide-y divide-ink-100">
          <tr v-for="o in gpts" :key="o.id">
            <td class="max-w-[360px] truncate px-4 py-3">
              <a :href="String(o.payload.gptUrl)" target="_blank" rel="noopener noreferrer nofollow" class="text-brand-600 hover:text-brand-700">{{ o.payload.gptUrl }}</a>
            </td>
            <td class="whitespace-nowrap px-4 py-3 text-ink-600">{{ date(o.paidAt ?? o.createdAt) }}</td>
            <td class="px-4 py-3">
              <span :class="['whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold', orderStatusClass[o.status] ?? 'bg-ink-100 text-ink-500']">{{ t(`promote.orders.statuses.${o.status}`) }}</span>
            </td>
          </tr>
        </tbody>
      </table>

      <p v-if="error" class="py-16 text-center text-sm text-red-600">{{ t('websiteInsights.loadError') }}</p>
      <p v-else-if="pending && !gpts.length" class="py-16 text-center text-sm text-ink-400">{{ t('promote.orders.loading') }}</p>
      <div v-else-if="!gpts.length" class="flex flex-col items-center gap-4 py-16">
        <p class="text-sm text-ink-900">{{ t('myGPTsPage.emptyMessage') }}</p>
        <NuxtLink to="/submit-gpt" class="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
          {{ t('myGPTsPage.submitYourGPT') }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
