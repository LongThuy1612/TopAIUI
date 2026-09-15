<script setup lang="ts">
const { t } = useI18n()
const { logout } = useAdminAuth()
const route = useRoute()

function confirmLogout() {
  if (!confirm(t('admin.logoutConfirm'))) return
  logout()
  navigateTo('/admin/login')
}

const researchItems = computed(() => [
  { label: t('admin.websiteInsights'), icon: 'M4 19h16M6 15l3-4 3 2 4-6 2 3', color: 'bg-orange-50 text-orange-500' },
  { label: t('admin.socialListening'), icon: 'M12 3a7 7 0 0 0-7 7c0 3.5 2 5.5 3 7l1 2h6l1-2c1-1.5 3-3.5 3-7a7 7 0 0 0-7-7Zm-2 18h4', color: 'bg-pink-50 text-pink-500' },
  { label: t('admin.researchReport'), icon: 'M6 3h9l4 4v14H6V3Zm8 9H9m6 4H9', color: 'bg-blue-50 text-blue-500' }
])

const businessItems = computed(() => [
  { label: t('admin.myAIs'), icon: 'M5 12h5m4 0h5M5 12a2 2 0 0 1 2-2h1m6 0h1a2 2 0 0 1 2 2m-12 0a2 2 0 0 0 2 2h1m6 0h1a2 2 0 0 0 2-2' },
  { label: t('admin.advertiseAI'), icon: 'M4 19h16M8 15v-4M12 15V9m4 6v-8' },
  { label: t('admin.postsLinks'), icon: 'M6 3h12v18H6V3Zm3 5h6m-6 4h6m-6 4h4' },
  { label: t('admin.myGPTs'), icon: 'M12 2 2 7l10 5 10-5-10-5Zm0 10L2 7v10l10 5 10-5V7l-10 5Z' }
])
</script>

<template>
  <aside class="sticky top-[64px] hidden h-[calc(100vh-64px)] w-[220px] shrink-0 flex-col gap-6 overflow-y-auto border-r border-ink-200 bg-white px-4 py-5 lg:flex">
    <NuxtLink
      to="/admin"
      :class="['flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-bold', route.path === '/admin' ? 'bg-brand-50 text-brand-600' : 'text-ink-700 hover:bg-ink-100/60']"
    >
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2 7-7 7 7 2 2M5 10v10h14V10" />
      </svg>
      {{ t('admin.dashboard') }}
    </NuxtLink>

    <NuxtLink
      to="/admin/tools"
      :class="['flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-bold', route.path === '/admin/tools' ? 'bg-brand-50 text-brand-600' : 'text-ink-700 hover:bg-ink-100/60']"
    >
      <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m-9 4h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2.5l-1-1h-3l-1 1H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z" />
      </svg>
      {{ t('admin.manageTools') }}
    </NuxtLink>

    <div>
      <div class="px-3 text-[11px] font-semibold uppercase tracking-wide text-ink-400">{{ t('admin.research') }}</div>
      <div class="mt-2 flex flex-col gap-0.5">
        <a v-for="item in researchItems" :key="item.label" href="#" class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-100/60">
          <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
          </svg>
          {{ item.label }}
        </a>
      </div>
    </div>

    <div class="rounded-xl border border-ink-100 bg-ink-100/30 p-3.5">
      <div class="text-xs font-bold text-ink-800">{{ t('admin.freePlan') }}</div>
      <div class="mt-3 flex items-center justify-between text-[11px] text-ink-500">
        <span>{{ t('admin.websiteInsightsQuota') }}</span>
      </div>
      <div class="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ink-200">
        <div class="h-full w-1/5 rounded-full bg-brand-400"></div>
      </div>
      <div class="mt-2.5 text-[11px] text-ink-500">{{ t('admin.socialListeningQueries') }}</div>
      <div class="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ink-200">
        <div class="h-full w-3/4 rounded-full bg-emerald-400"></div>
      </div>
      <a href="#" class="mt-3 flex items-center gap-1 text-xs font-bold text-brand-500 hover:text-brand-600">
        <svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2 3 12h5l-1 6 8-10h-5l1-6Z" /></svg>
        {{ t('admin.upgrade') }}
      </a>
    </div>

    <div>
      <div class="px-3 text-[11px] font-semibold uppercase tracking-wide text-ink-400">{{ t('admin.business') }}</div>
      <div class="mt-2 flex flex-col gap-0.5">
        <a v-for="item in businessItems" :key="item.label" href="#" class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-100/60">
          <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
          </svg>
          {{ item.label }}
        </a>
      </div>
    </div>

    <div>
      <div class="px-3 text-[11px] font-semibold uppercase tracking-wide text-ink-400">{{ t('admin.other') }}</div>
      <div class="mt-2 flex flex-col gap-0.5">
        <a href="#" class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-100/60">
          <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27Z" />
          </svg>
          {{ t('admin.favourite') }}
        </a>
      </div>
    </div>

    <div class="mt-auto flex items-center gap-2.5 rounded-lg border border-ink-100 px-3 py-2.5">
      <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">A</span>
      <span class="min-w-0 flex-1">
        <span class="block truncate text-xs font-bold text-ink-900">{{ t('admin.badge') }}</span>
        <span class="block truncate text-[11px] text-ink-400">{{ t('admin.sharedLogin') }}</span>
      </span>
      <button type="button" :title="t('admin.logout')" class="shrink-0 text-ink-400 hover:text-brand-500" @click="confirmLogout">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0-4-4m4 4H7m4 8H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6" />
        </svg>
      </button>
    </div>
  </aside>
</template>
