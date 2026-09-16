<script setup lang="ts">
const { t } = useI18n()
const { token, load } = useAdminAuth()
load()

if (import.meta.client && !token.value) {
  await navigateTo('/admin/login')
}

type SocialTool = {
  name: string
  intro: string
  website: string
  avatarBg: string
  category: string
  videoCount: number
  creatorsCount: number
  monthlyTraffic: number
  avgViews: number
  avgInteractions: number
  totalViews: number
  totalInteractions: number
}

const tools: SocialTool[] = [
  { name: 'Beacons', intro: 'All-in-one platform for content creators to build websites, sell products, and grow their audience.', website: 'https://beacons.ai', avatarBg: 'bg-ink-900', category: 'Marketing', videoCount: 127600, creatorsCount: 15200, monthlyTraffic: 26400000, avgViews: 65100, avgInteractions: 2600, totalViews: 8300000000, totalInteractions: 331700000 },
  { name: 'CapCut', intro: 'CapCut is an AI-driven all-in-one video editing app for creating and editing short videos.', website: 'https://www.capcut.com', avatarBg: 'bg-ink-900', category: 'Video', videoCount: 91900, creatorsCount: 53300, monthlyTraffic: 49100000, avgViews: 11500, avgInteractions: 435, totalViews: 1100000000, totalInteractions: 40000000 },
  { name: 'VidIQ', intro: 'VidIQ is a SaaS platform that helps YouTube creators grow their channel with data-driven insights.', website: 'https://vidiq.com', avatarBg: 'bg-blue-600', category: 'Video', videoCount: 72200, creatorsCount: 5900, monthlyTraffic: 6700000, avgViews: 11700, avgInteractions: 429, totalViews: 845800000, totalInteractions: 31000000 },
  { name: 'Mailchimp', intro: 'Marketing automation and email platform for growing businesses of every size.', website: 'https://mailchimp.com', avatarBg: 'bg-violet-500', category: 'Marketing', videoCount: 60100, creatorsCount: 6300, monthlyTraffic: 9700000, avgViews: 19100, avgInteractions: 843, totalViews: 1100000000, totalInteractions: 50700000 },
  { name: 'ChatGPT', intro: 'A free-to-use AI system for conversational assistance, writing, coding, and more.', website: 'https://chatgpt.com', avatarBg: 'bg-emerald-600', category: 'Writing', videoCount: 41600, creatorsCount: 13900, monthlyTraffic: 5600000000, avgViews: 7500, avgInteractions: 264, totalViews: 310600000, totalInteractions: 11000000 },
  { name: 'ElevenLabs', intro: 'AI audio platform offering text-to-speech and voice cloning for creators and developers.', website: 'https://elevenlabs.io', avatarBg: 'bg-ink-900', category: 'Audio', videoCount: 41200, creatorsCount: 8600, monthlyTraffic: 36400000, avgViews: 55600, avgInteractions: 2700, totalViews: 2300000000, totalInteractions: 112500000 },
  { name: 'PhotoAI - AI Art and Face Swap (ios)', intro: 'AI-powered photo editing app for art, face swap, and creative image generation.', website: 'https://photoai.com', avatarBg: 'bg-ink-900', category: 'Image', videoCount: 36100, creatorsCount: 5600, monthlyTraffic: 133800000, avgViews: 71300, avgInteractions: 2000, totalViews: 2600000000, totalInteractions: 71200000 },
  { name: 'Movavi', intro: 'Movavi provides user-friendly photo and video editing software for everyday creators.', website: 'https://www.movavi.com', avatarBg: 'bg-ink-900', category: 'Video', videoCount: 33600, creatorsCount: 8600, monthlyTraffic: 2000000, avgViews: 559, avgInteractions: 19, totalViews: 18800000, totalInteractions: 637400 },
  { name: 'Suno', intro: 'AI music generator for creating, editing, and producing original songs from text prompts.', website: 'https://suno.com', avatarBg: 'bg-orange-500', category: 'Audio', videoCount: 31500, creatorsCount: 6800, monthlyTraffic: 72700000, avgViews: 3100, avgInteractions: 86, totalViews: 96500000, totalInteractions: 2700000 }
]

const categories = computed(() => ['all', ...new Set(tools.map(t => t.category))])
const activeCategory = ref('all')
const search = ref('')

type SortKey = 'videoCount' | 'creatorsCount' | 'monthlyTraffic' | 'avgViews' | 'avgInteractions' | 'totalViews' | 'totalInteractions'
const sortKey = ref<SortKey>('videoCount')
const sortDir = ref<'asc' | 'desc'>('desc')

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'desc' ? 'asc' : 'desc'
  } else {
    sortKey.value = key
    sortDir.value = 'desc'
  }
}

const filteredTools = computed(() => {
  const q = search.value.trim().toLowerCase()
  let list = tools.filter(item =>
    (activeCategory.value === 'all' || item.category === activeCategory.value) &&
    (!q || item.name.toLowerCase().includes(q))
  )
  list = [...list].sort((a, b) => (a[sortKey.value] - b[sortKey.value]) * (sortDir.value === 'asc' ? 1 : -1))
  return list
})

function formatCompact(n: number) {
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

function initials(name: string) {
  return name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase()
}

const sortColumns: { key: SortKey; labelKey: string }[] = [
  { key: 'videoCount', labelKey: 'colVideoCount' },
  { key: 'creatorsCount', labelKey: 'colCreatorsCount' },
  { key: 'monthlyTraffic', labelKey: 'colMonthlyTraffic' },
  { key: 'avgViews', labelKey: 'colAvgViews' },
  { key: 'avgInteractions', labelKey: 'colAvgInteractions' },
  { key: 'totalViews', labelKey: 'colTotalViews' },
  { key: 'totalInteractions', labelKey: 'colTotalInteractions' }
]

useSeoMeta({
  title: () => `${t('socialListening.title')} — TopAICollection`
})
</script>

<template>
  <div class="flex min-h-[calc(100vh-64px)] w-full">
    <AdminSidebar />

    <div class="min-w-0 flex-1 px-6 py-6 lg:px-8">
      <h1 class="flex items-center gap-2 text-xl font-extrabold text-ink-900">
        <span>💬</span> {{ t('socialListening.title') }}
      </h1>
      <p class="mt-1 text-sm text-ink-900">{{ t('socialListening.subtitle') }}</p>

      <div class="mt-5 flex flex-wrap items-center gap-3">
        <select v-model="activeCategory" class="rounded-lg border border-ink-200 px-3 py-2 text-sm font-semibold text-ink-900 outline-none focus:border-brand-400">
          <option v-for="c in categories" :key="c" :value="c">{{ c === 'all' ? t('socialListening.allCategories') : c }}</option>
        </select>
        <div class="relative">
          <input
            v-model="search"
            type="text"
            :placeholder="t('socialListening.searchPlaceholder')"
            class="w-72 rounded-lg border border-ink-200 py-2 pl-3 pr-9 text-sm outline-none focus:border-brand-400"
          >
          <svg class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-4.3-4.3M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />
          </svg>
        </div>
      </div>

      <div class="mt-5 overflow-x-auto rounded-xl border border-ink-100">
        <table class="w-full min-w-[1100px] text-left text-sm">
          <thead class="border-b border-ink-100 text-xs font-bold uppercase tracking-wide text-ink-900">
            <tr>
              <th class="px-4 py-3">{{ t('socialListening.colTool') }}</th>
              <th class="px-4 py-3">{{ t('socialListening.colIntroduce') }}</th>
              <th v-for="col in sortColumns" :key="col.key" class="px-4 py-3">
                <button type="button" class="flex items-center gap-1 hover:text-brand-600" @click="toggleSort(col.key)">
                  {{ t(`socialListening.${col.labelKey}`) }}
                  <svg class="h-3 w-3 shrink-0" fill="none" viewBox="0 0 20 20" stroke="currentColor" stroke-width="2.5">
                    <path v-if="sortKey === col.key && sortDir === 'asc'" stroke-linecap="round" stroke-linejoin="round" d="m5 12 5-5 5 5" />
                    <path v-else-if="sortKey === col.key && sortDir === 'desc'" stroke-linecap="round" stroke-linejoin="round" d="m5 8 5 5 5-5" />
                    <path v-else stroke-linecap="round" stroke-linejoin="round" d="M5 8.5 10 4l5 4.5M5 11.5 10 16l5-4.5" class="text-ink-300" />
                  </svg>
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredTools" :key="item.name" class="border-t border-ink-100 hover:bg-ink-100/30">
              <td class="px-4 py-4">
                <a :href="item.website" target="_blank" rel="noopener noreferrer nofollow" class="flex items-center gap-2.5 hover:opacity-80">
                  <span :class="['flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white', item.avatarBg]">{{ initials(item.name) }}</span>
                  <span class="font-semibold text-ink-900 hover:text-brand-600">{{ item.name }}</span>
                </a>
              </td>
              <td class="max-w-[280px] truncate px-4 py-4 text-ink-900">{{ item.intro }}</td>
              <td class="px-4 py-4 font-semibold text-brand-600">{{ formatCompact(item.videoCount) }}</td>
              <td class="px-4 py-4 text-ink-900">{{ formatCompact(item.creatorsCount) }}</td>
              <td class="px-4 py-4 text-ink-900">{{ formatCompact(item.monthlyTraffic) }}</td>
              <td class="px-4 py-4 text-ink-900">{{ formatCompact(item.avgViews) }}</td>
              <td class="px-4 py-4 text-ink-900">{{ formatCompact(item.avgInteractions) }}</td>
              <td class="px-4 py-4 text-ink-900">{{ formatCompact(item.totalViews) }}</td>
              <td class="px-4 py-4 text-ink-900">{{ formatCompact(item.totalInteractions) }}</td>
            </tr>
          </tbody>
        </table>

        <div v-if="!filteredTools.length" class="py-16 text-center text-sm text-ink-900">
          {{ t('socialListening.noResults') }}
        </div>
      </div>
    </div>
  </div>
</template>
