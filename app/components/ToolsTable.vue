<script setup lang="ts">
import type { Tool } from '~/types'

// `admin`: rows open the admin editor and the empty state offers "New tool".
// Otherwise (a user's own tools) rows open the public tool page — or, while
// the tool isn't published yet, its edit page — and the empty state points to
// the paid submit / advertise pages.
const props = defineProps<{ tools: Tool[]; admin?: boolean }>()

const rowLink = (tool: Tool) => {
  if (props.admin) return `/admin/tools/${tool.id}`
  return tool.status === 'PUBLISHED' ? `/tools/${tool.slug}` : `/dashboard/my-ais/${tool.id}`
}

const statusClass: Record<string, string> = {
  PUBLISHED: 'bg-emerald-50 text-emerald-700',
  CANCELED: 'bg-red-50 text-red-700'
}

const { t } = useI18n()

function formatCompact(n: number) {
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

function formatDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="overflow-x-auto rounded-xl border border-ink-100">
    <table class="w-full min-w-[900px] text-left text-sm">
      <thead class="bg-ink-100/40 text-xs uppercase tracking-wide text-ink-400">
        <tr>
          <th class="px-4 py-3">{{ t('admin.colTool') }}</th>
          <th class="px-4 py-3">{{ t('admin.colOrganicClicks') }}</th>
          <th class="px-4 py-3">{{ t('admin.colPaidClicks') }}</th>
          <th class="px-4 py-3">{{ t('admin.colTotalClicks') }}</th>
          <th class="px-4 py-3">{{ t('admin.colOpenDetails') }}</th>
          <th class="px-4 py-3">{{ t('admin.colSave') }}</th>
          <th class="px-4 py-3">{{ t('admin.colImpressions') }}</th>
          <th class="px-4 py-3">{{ t('admin.colAddedOn') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="tool in tools" :key="tool.id" class="border-t border-ink-100">
          <td class="px-4 py-3">
            <NuxtLink :to="rowLink(tool)" class="flex items-center gap-2.5 hover:opacity-80">
              <div v-if="tool.logoUrl" class="h-8 w-8 shrink-0 overflow-hidden rounded-lg">
                <img :src="tool.logoUrl" :alt="tool.name" class="h-full w-full object-cover">
              </div>
              <div v-else class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white">
                {{ tool.name.slice(0, 2).toUpperCase() }}
              </div>
              <div class="min-w-0">
                <div class="truncate font-semibold text-ink-900 hover:text-brand-600">{{ tool.name }}</div>
                <span :class="['inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold', statusClass[tool.status] ?? 'bg-amber-50 text-amber-700']">
                  {{ tool.status }}
                </span>
                <span v-if="admin && tool.ownerId" class="ml-1 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
                  {{ tool.step2 || tool.status !== 'PENDING' ? t('admin.userSubmission') : t('admin.waitingUserContent') }}
                </span>
              </div>
            </NuxtLink>
          </td>
          <td class="px-4 py-3 text-ink-600">{{ formatCompact(tool.clicksOrganic) }}</td>
          <td class="px-4 py-3 text-ink-600">{{ formatCompact(tool.clicksPaid) }}</td>
          <td class="px-4 py-3 text-ink-600">{{ formatCompact(tool.clicksOrganic + tool.clicksPaid) }}</td>
          <td class="px-4 py-3 text-ink-600">{{ formatCompact(tool.viewCount) }}</td>
          <td class="px-4 py-3 text-ink-600">{{ formatCompact(tool.collectionCount) }}</td>
          <td class="px-4 py-3 text-ink-600">{{ formatCompact(tool.impressions) }}</td>
          <td class="px-4 py-3 text-ink-500">{{ formatDate(tool.createdAt) }}</td>
        </tr>
      </tbody>
    </table>

    <div v-if="!tools.length" class="flex flex-col items-center gap-4 py-16">
      <p class="text-sm text-ink-400">{{ t('admin.noToolsMatch') }}</p>
      <div class="flex gap-3">
        <NuxtLink :to="admin ? '/admin/tools/new' : '/submit'" class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">{{ admin ? t('admin.newTool') : t('admin.submitYourTool') }}</NuxtLink>
        <NuxtLink v-if="!admin" to="/advertise" class="rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 hover:border-brand-300">{{ t('admin.advertiseYourTool') }}</NuxtLink>
      </div>
    </div>
  </div>
</template>
