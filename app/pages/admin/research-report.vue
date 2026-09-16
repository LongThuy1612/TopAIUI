<script setup lang="ts">
const { t } = useI18n()
const { token, load } = useAdminAuth()
load()

if (import.meta.client && !token.value) {
  await navigateTo('/admin/login')
}

type ReportTab = 'all' | 'overall' | 'sector' | 'primary' | 'sub'

type Report = {
  title: string
  date: string
  tab: Exclude<ReportTab, 'all'>
}

const reports: Report[] = [
  { title: 'June 2026 AI Industry Overall Insights', date: 'July 20, 2026', tab: 'overall' },
  { title: 'June 2026 AI Industry Segment Insights', date: 'July 20, 2026', tab: 'overall' },
  { title: 'June 2026 Other Sector Analysis Report', date: 'July 20, 2026', tab: 'primary' },
  { title: 'June 2026 Office & Productivity Sector Analysis Report', date: 'July 20, 2026', tab: 'primary' },
  { title: 'June 2026 Research & Data Analysis Sector Analysis Report', date: 'July 20, 2026', tab: 'primary' },
  { title: 'June 2026 Interior & Architectural Design Sector Analysis Report', date: 'July 20, 2026', tab: 'primary' },
  { title: 'June 2026 Chatbots & Virtual Companions Sector Analysis Report', date: 'July 20, 2026', tab: 'sector' },
  { title: 'June 2026 Education & Translation Sector Analysis Report', date: 'July 20, 2026', tab: 'sector' },
  { title: 'June 2026 Business Research Sector Analysis Report', date: 'July 20, 2026', tab: 'sector' },
  { title: 'June 2026 Marketing & Advertising Sector Analysis Report', date: 'July 20, 2026', tab: 'sector' },
  { title: 'June 2026 Health & Wellness Sector Analysis Report', date: 'July 20, 2026', tab: 'sector' },
  { title: 'June 2026 Business Management Sector Analysis Report', date: 'July 20, 2026', tab: 'sector' },
  { title: 'June 2026 Legal & Finance Sector Analysis Report', date: 'July 20, 2026', tab: 'sector' },
  { title: 'June 2026 Daily Life Sector Analysis Report', date: 'July 20, 2026', tab: 'sector' },
  { title: 'June 2026 Video & Animation Sector Analysis Report', date: 'July 20, 2026', tab: 'sub' },
  { title: 'June 2026 Coding & Development Sector Analysis Report', date: 'July 20, 2026', tab: 'sub' },
  { title: 'June 2026 AI Detection & Anti-Detection Sector Analysis Report', date: 'July 20, 2026', tab: 'sub' },
  { title: 'June 2026 Social Media Sector Analysis Report', date: 'July 20, 2026', tab: 'sub' },
  { title: 'June 2026 Art & Creative Design Sector Analysis Report', date: 'July 20, 2026', tab: 'sub' },
  { title: 'June 2026 Voice Generation & Conversion Sector Analysis Report', date: 'July 20, 2026', tab: 'sub' }
]

const tabs: { key: ReportTab; labelKey: string }[] = [
  { key: 'all', labelKey: 'tabAll' },
  { key: 'overall', labelKey: 'tabOverall' },
  { key: 'sector', labelKey: 'tabSector' },
  { key: 'primary', labelKey: 'tabPrimary' },
  { key: 'sub', labelKey: 'tabSub' }
]
const activeTab = ref<ReportTab>('all')

const filteredReports = computed(() => activeTab.value === 'all' ? reports : reports.filter(r => r.tab === activeTab.value))

useSeoMeta({
  title: () => `${t('researchReportPage.title')} — TopAICollection`
})
</script>

<template>
  <div class="flex min-h-[calc(100vh-64px)] w-full">
    <AdminSidebar />

    <div class="min-w-0 flex-1 px-6 py-6 lg:px-8">
      <h1 class="flex items-center gap-2 text-[24px] font-semibold text-[rgb(25,25,25)]">
        <span>📁</span> {{ t('researchReportPage.title') }}
      </h1>
      <p class="mt-1 max-w-3xl text-sm text-[rgb(75,85,99)]">{{ t('researchReportPage.subtitle') }}</p>

      <div class="mt-5 flex flex-wrap gap-5 border-b border-ink-100">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          :class="[
            'border-b-2 pb-2.5 text-sm font-semibold transition',
            activeTab === tab.key ? 'border-brand-500 text-brand-600' : 'border-transparent text-[rgb(75,85,99)] hover:text-brand-600'
          ]"
          @click="activeTab = tab.key"
        >
          {{ t(`researchReportPage.${tab.labelKey}`) }}
        </button>
      </div>

      <div class="mt-4">
        <select class="rounded-lg border border-ink-200 px-3 py-2 text-sm font-semibold text-[rgb(75,85,99)] outline-none focus:border-brand-400">
          <option>{{ t('researchReportPage.allMonths') }}</option>
        </select>
      </div>

      <div class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <a
          v-for="report in filteredReports"
          :key="report.title"
          href="#"
          class="rounded-xl border border-ink-100 bg-white p-4 transition hover:border-brand-300"
        >
          <div class="text-xs text-[rgb(75,85,99)]">{{ report.date }}</div>
          <div class="mt-1.5 text-sm font-semibold text-[rgb(75,85,99)]">{{ report.title }}</div>
        </a>
      </div>

      <div v-if="!filteredReports.length" class="py-16 text-center text-sm text-[rgb(75,85,99)]">
        {{ t('researchReportPage.noResults') }}
      </div>
    </div>
  </div>
</template>
