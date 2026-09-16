<script setup lang="ts">
const { t } = useI18n()
const { token, load } = useAdminAuth()
load()

if (import.meta.client && !token.value) {
  await navigateTo('/admin/login')
}

type InsightTool = {
  name: string
  domain: string
  website: string
  avatarBg: string
  categories: string[]
  monthlyVisits: number
  growth: number
  growthRate: number
  avgVisitDuration: string
  bounceRate: number
}

const tools: InsightTool[] = [
  { name: 'ChatGPT', domain: 'chatgpt.com', website: 'https://chatgpt.com', avatarBg: 'bg-ink-900', categories: ['AI Chatbot', 'AI Assistant', '+6'], monthlyVisits: 5600000000, growth: 188000000, growthRate: 3.45, avgVisitDuration: '00:06:40', bounceRate: 26.58 },
  { name: 'Google Gemini', domain: 'gemini.google.com', website: 'https://gemini.google.com', avatarBg: 'bg-blue-500', categories: ['AI Chatbot', 'AI Assistant', '+2'], monthlyVisits: 2600000000, growth: -69500000, growthRate: -2.59, avgVisitDuration: '00:06:52', bounceRate: 27.30 },
  { name: 'Claude', domain: 'claude.ai', website: 'https://claude.ai', avatarBg: 'bg-orange-500', categories: ['AI Assistant', 'AI Chatbot', '+2'], monthlyVisits: 950200000, growth: -19100000, growthRate: -1.97, avgVisitDuration: '00:06:02', bounceRate: 27.25 },
  { name: 'Adobe', domain: 'adobe.com', website: 'https://adobe.com', avatarBg: 'bg-red-600', categories: ['AI Graphic Design', 'AI Image Generator', '+6'], monthlyVisits: 433900000, growth: 53700000, growthRate: 14.13, avgVisitDuration: '00:02:57', bounceRate: 48.14 },
  { name: 'DeepSeek', domain: 'deepseek.com', website: 'https://deepseek.com', avatarBg: 'bg-blue-600', categories: ['Large Language Models (LLMs)', 'Open Source AI Models', '+6'], monthlyVisits: 353800000, growth: 7400000, growthRate: 2.14, avgVisitDuration: '00:05:46', bounceRate: 37.60 },
  { name: 'Unibase Memory', domain: 'chromewebstore.google.com', website: 'https://chromewebstore.google.com', avatarBg: 'bg-sky-500', categories: ['AI Tools Directory', 'Prompt Engineering', '+1'], monthlyVisits: 211300000, growth: 4700000, growthRate: 2.27, avgVisitDuration: '00:01:50', bounceRate: 56.06 },
  { name: 'Grok', domain: 'grok.com', website: 'https://grok.com', avatarBg: 'bg-ink-900', categories: ['AI Assistant', 'AI Search Engine', '+2'], monthlyVisits: 209600000, growth: -830900, growthRate: -0.39, avgVisitDuration: '00:10:49', bounceRate: 31.77 },
  { name: 'OpenAI', domain: 'openai.com', website: 'https://openai.com', avatarBg: 'bg-ink-900', categories: ['AI Models', 'AI API', '+4'], monthlyVisits: 204300000, growth: 7100000, growthRate: 3.60, avgVisitDuration: '00:02:30', bounceRate: 57.40 }
]

const search = ref('')

const filteredTools = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return tools
  return tools.filter(item => item.name.toLowerCase().includes(q) || item.domain.toLowerCase().includes(q))
})

function formatCompact(n: number) {
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(Math.abs(n))
}

function initials(name: string) {
  return name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase()
}

const sparklineUp = 'M0 20 L10 15 L20 17 L30 10 L40 12 L50 4'
const sparklineDown = 'M0 4 L10 8 L20 6 L30 14 L40 12 L50 20'

useSeoMeta({
  title: () => `${t('websiteInsights.title')} — TopAICollection`
})
</script>

<template>
  <div class="flex min-h-[calc(100vh-64px)] w-full">
    <AdminSidebar />

    <div class="min-w-0 flex-1 px-6 py-6 lg:px-8">
      <h1 class="flex items-center gap-2 text-xl font-extrabold text-ink-900">
        <span>📈</span> {{ t('websiteInsights.title') }}
      </h1>

      <div class="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-3">
          <select class="rounded-lg border border-ink-200 px-3 py-2 text-sm font-semibold text-ink-900 outline-none focus:border-brand-400">
            <option>08/2026</option>
          </select>
          <div class="relative">
            <input
              v-model="search"
              type="text"
              :placeholder="t('websiteInsights.searchPlaceholder')"
              class="w-72 rounded-lg border border-ink-200 py-2 pl-3 pr-9 text-sm outline-none focus:border-brand-400"
            >
            <svg class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-4.3-4.3M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />
            </svg>
          </div>
        </div>
        <button type="button" class="flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-2 text-sm font-semibold text-ink-900 hover:border-brand-300">
          {{ t('websiteInsights.advancedFilter') }}
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 20 20" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 5h14M6 10h8M9 15h2" /></svg>
        </button>
      </div>

      <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
        <button type="button" class="rounded-lg border border-brand-300 px-3 py-2 text-sm font-semibold text-brand-600 hover:bg-brand-50">
          {{ t('websiteInsights.bulkOpen') }}
        </button>
        <div class="flex items-center gap-3">
          <select class="rounded-lg border border-ink-200 px-3 py-2 text-sm font-semibold text-ink-900 outline-none focus:border-brand-400">
            <option>{{ t('websiteInsights.sortDefault') }}</option>
          </select>
          <button type="button" class="flex items-center gap-1.5 rounded-lg bg-ink-900 px-3 py-2 text-sm font-semibold text-white hover:bg-ink-800">
            {{ t('websiteInsights.export') }}
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 20 20" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m5 7.5 5 5 5-5" /></svg>
          </button>
        </div>
      </div>

      <div class="mt-5 overflow-x-auto rounded-xl border border-ink-100">
        <table class="w-full min-w-[1200px] text-left text-sm">
          <thead class="border-b border-ink-100 text-xs font-bold uppercase tracking-wide text-ink-900">
            <tr>
              <th class="w-10 px-4 py-3"><input type="checkbox" class="h-4 w-4 rounded border-ink-300"></th>
              <th class="w-10 px-2 py-3">#</th>
              <th class="px-4 py-3">{{ t('websiteInsights.colTool') }}</th>
              <th class="px-4 py-3">{{ t('websiteInsights.colMonthlyVisits') }}</th>
              <th class="px-4 py-3">{{ t('websiteInsights.colGrowth') }}</th>
              <th class="px-4 py-3">{{ t('websiteInsights.colGrowthRate') }}</th>
              <th class="px-4 py-3">{{ t('websiteInsights.colCategory') }}</th>
              <th class="px-4 py-3">{{ t('websiteInsights.colAvgVisitDuration') }}</th>
              <th class="px-4 py-3">{{ t('websiteInsights.colAction') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, i) in filteredTools" :key="item.name" class="border-t border-ink-100 hover:bg-ink-100/30">
              <td class="px-4 py-4"><input type="checkbox" class="h-4 w-4 rounded border-ink-300"></td>
              <td class="px-2 py-4 text-ink-900">{{ i + 1 }}</td>
              <td class="px-4 py-4">
                <div class="flex items-center gap-2.5">
                  <span :class="['flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white', item.avatarBg]">{{ initials(item.name) }}</span>
                  <div class="min-w-0">
                    <div class="font-semibold text-ink-900">{{ item.name }}</div>
                    <a :href="item.website" target="_blank" rel="noopener noreferrer nofollow" class="flex items-center gap-1 text-xs text-ink-900 hover:text-brand-600">
                      {{ item.domain }}
                      <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H18m0 0v4.5M18 6l-7.5 7.5M6 6.75h3M6 12h3m-3 5.25h9a1.5 1.5 0 001.5-1.5V13.5" /></svg>
                    </a>
                  </div>
                </div>
              </td>
              <td class="px-4 py-4">
                <div class="flex items-center gap-2">
                  <svg class="h-5 w-14 shrink-0" :class="item.growth >= 0 ? 'text-emerald-500' : 'text-red-500'" viewBox="0 0 50 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path :d="item.growth >= 0 ? sparklineUp : sparklineDown" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                  <span class="font-semibold text-ink-900">{{ formatCompact(item.monthlyVisits) }}</span>
                </div>
              </td>
              <td class="px-4 py-4">
                <span :class="['flex items-center gap-1 font-semibold', item.growth >= 0 ? 'text-emerald-600' : 'text-red-600']">
                  {{ item.growth >= 0 ? '+' : '-' }}{{ formatCompact(item.growth) }}
                  <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 20 20" stroke="currentColor" stroke-width="2.5">
                    <path v-if="item.growth >= 0" stroke-linecap="round" stroke-linejoin="round" d="M5 12.5 12.5 5m0 0H7m5.5 0V10" />
                    <path v-else stroke-linecap="round" stroke-linejoin="round" d="M5 5 12.5 12.5m0 0H7m5.5 0V7" />
                  </svg>
                </span>
              </td>
              <td class="px-4 py-4">
                <span :class="['flex items-center gap-1 font-semibold', item.growthRate >= 0 ? 'text-emerald-600' : 'text-red-600']">
                  {{ item.growthRate >= 0 ? '+' : '' }}{{ item.growthRate.toFixed(2) }}%
                  <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 20 20" stroke="currentColor" stroke-width="2.5">
                    <path v-if="item.growthRate >= 0" stroke-linecap="round" stroke-linejoin="round" d="M5 12.5 12.5 5m0 0H7m5.5 0V10" />
                    <path v-else stroke-linecap="round" stroke-linejoin="round" d="M5 5 12.5 12.5m0 0H7m5.5 0V7" />
                  </svg>
                </span>
              </td>
              <td class="px-4 py-4">
                <div class="flex max-w-[220px] flex-wrap gap-1">
                  <span v-for="cat in item.categories" :key="cat" class="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-900">{{ cat }}</span>
                </div>
              </td>
              <td class="px-4 py-4">
                <div class="font-semibold text-ink-900">{{ item.avgVisitDuration }}</div>
                <div class="text-xs text-ink-900">{{ t('websiteInsights.bounceRate') }}: {{ item.bounceRate.toFixed(2) }}%</div>
              </td>
              <td class="px-4 py-4">
                <a :href="item.website" target="_blank" rel="noopener noreferrer nofollow" class="text-sm font-semibold text-brand-600 hover:text-brand-700">{{ t('websiteInsights.view') }}</a>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="!filteredTools.length" class="py-16 text-center text-sm text-ink-900">
          {{ t('websiteInsights.noResults') }}
        </div>
      </div>
    </div>
  </div>
</template>
