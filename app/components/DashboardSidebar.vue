<script setup lang="ts">
const { t, locale } = useI18n()
const { user, isAdmin } = useAuth()
const route = useRoute()
// Active-item checks compare against the English paths (/vi/dashboard → /dashboard).
const basePath = useBasePath()

const accountInitial = computed(() => (user.value?.name || user.value?.email || 'U').slice(0, 1).toUpperCase())
const accountName = computed(() => user.value?.name || user.value?.email || '')
const accountSubtitle = computed(() => (isAdmin.value ? t('admin.badge') : user.value?.email || ''))

// Admin sections and their sub-pages (/admin/tools/new, /admin/users/:id…).
const onToolsPage = computed(() => basePath.value.startsWith('/admin/tools'))
const onUsersPage = computed(() => basePath.value.startsWith('/admin/users'))
const onReviewsPage = computed(() => basePath.value.startsWith('/admin/reviews'))
// /admin/feedback is taken by the redirect for the old user Feedback URL (nuxt.config.ts).
const onFeedbackPage = computed(() => basePath.value.startsWith('/admin/user-feedback'))
const onContactPage = computed(() => basePath.value.startsWith('/admin/contact-messages'))
const onAdsPage = computed(() => basePath.value.startsWith('/admin/ads'))
const onPostsPage = computed(() => basePath.value.startsWith('/admin/posts') || basePath.value.startsWith('/admin/articles'))
const onGptsPage = computed(() => basePath.value.startsWith('/admin/gpts'))

const researchItems = computed(() => [
  { label: t('admin.websiteInsights'), to: '/dashboard/insights', icon: 'M4 19h16M6 15l3-4 3 2 4-6 2 3', color: 'bg-orange-50 text-orange-500' },
  { label: t('admin.socialListening'), to: '/dashboard/social-listening', icon: 'M12 3a7 7 0 0 0-7 7c0 3.5 2 5.5 3 7l1 2h6l1-2c1-1.5 3-3.5 3-7a7 7 0 0 0-7-7Zm-2 18h4', color: 'bg-pink-50 text-pink-500' }
])

// Shared so a page (e.g. Insights, out of Data Credits) can open it too.
const upgradeModalOpen = useState('upgrade-modal-open', () => false)

// Research Plan + this month's quota (customers only; admins have no plan).
const { authHeaders } = useAuth()
const { data: myPlan, refresh: refreshPlan } = useResearchPlan()
const planLabel = computed(() => (!myPlan.value || myPlan.value.plan === 'FREE'
  ? t('admin.freePlan')
  : t(`admin.upgradeModal.plan.${myPlan.value.plan.toLowerCase()}`)))
const quotaPct = (q: { used: number; limit: number } | undefined) => (q?.limit ? Math.min(100, Math.round((q.used / q.limit) * 100)) : 0)
const nf = computed(() => new Intl.NumberFormat(locale.value))

// Back from Stripe Checkout (?plan_session=…) or PayPal (?plan_provider=paypal&subscription_id=I-…):
// mirror the new subscription right away instead of waiting for the webhook, then drop the
// query from the URL.
onMounted(async () => {
  // From the public Ranking's "Upgrade" (?upgrade=1): open the plan picker.
  if (route.query.upgrade) {
    upgradeModalOpen.value = true
    const { upgrade: _u, ...rest } = route.query
    navigateTo({ query: rest }, { replace: true })
    return
  }
  const sessionId = route.query.plan_provider === 'paypal' ? route.query.subscription_id : route.query.plan_session
  if (typeof sessionId !== 'string' && !route.query.plan_canceled && !route.query.plan_provider) return
  if (typeof sessionId === 'string') {
    await $fetch(`/api/billing/session/${sessionId}`, { headers: authHeaders() }).catch(() => {})
    await refreshPlan()
  }
  const { plan_session: _s, plan_canceled: _c, plan_provider: _p, subscription_id: _i, ba_token: _b, token: _t, ...query } = route.query
  navigateTo({ query }, { replace: true })
})

const otherItems = computed(() => [
  { label: t('savedPage.title'), to: '/dashboard/saved', icon: 'M6 4h12v17l-6-4-6 4V4Z' },
  { label: t('admin.paymentInvoice'), to: '/dashboard/payment-invoice', icon: 'M7 3h10a1 1 0 0 1 1 1v17l-3-2-2 2-2-2-2 2-3-2V4a1 1 0 0 1 1-1Zm2 5h6m-6 4h6m-6 4h3' },
  // Admins read everyone's feedback under the admin "Feedback" link instead.
  ...(isAdmin.value ? [] : [
    { label: t('admin.feedback'), to: '/dashboard/feedback', icon: 'M4 5h16v11H8l-4 4V5Zm3 4h10m-10 3h6' },
    { label: t('admin.myInquiries'), to: '/dashboard/my-inquiries', icon: 'M4 6h16v12H4V6Zm0 0 8 7 8-7' }
  ])
])

// The customer's own purchases. Admins manage all of them above instead (Tool Management,
// Ad Campaigns, Guest posts, GPTs), so the Business section is customer-only — no item twice.
const businessItems = computed(() => (isAdmin.value ? [] : [
  { label: t('admin.myAIs'), to: '/dashboard/my-ais', icon: 'M5 12h5m4 0h5M5 12a2 2 0 0 1 2-2h1m6 0h1a2 2 0 0 1 2 2m-12 0a2 2 0 0 0 2 2h1m6 0h1a2 2 0 0 0 2-2' },
  { label: t('admin.advertiseAI'), to: '/dashboard/advertise', icon: 'M4 19h16M8 15v-4M12 15V9m4 6v-8' },
  { label: t('admin.postsLinks'), to: '/dashboard/my-posts', icon: 'M6 3h12v18H6V3Zm3 5h6m-6 4h6m-6 4h4' },
  { label: t('admin.myGPTs'), to: '/dashboard/my-gpts', icon: 'M12 2 2 7l10 5 10-5-10-5Zm0 10L2 7v10l10 5 10-5V7l-10 5Z' }
]))
</script>

<template>
  <aside class="no-scrollbar sticky top-[64px] hidden h-[calc(100vh-64px)] w-[280px] shrink-0 flex-col gap-6 overflow-y-auto border-r border-ink-200 bg-white px-4 py-5 lg:flex">
    <NuxtLinkLocale
      to="/dashboard"
      :class="['flex items-center gap-2.5 rounded-lg px-3 py-2 text-base font-bold', basePath === '/dashboard' ? 'bg-brand-50 text-brand-600' : 'text-ink-700 hover:bg-ink-100/60']"
    >
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2 7-7 7 7 2 2M5 10v10h14V10" />
      </svg>
      {{ t('admin.dashboard') }}
    </NuxtLinkLocale>

    <!-- Admin only; /admin/** pages and APIs also enforce the ADMIN role. -->
    <NuxtLinkLocale
      v-if="isAdmin"
      to="/admin/tools"
      :class="['flex items-center gap-2.5 rounded-lg px-3 py-2 text-base font-bold', onToolsPage ? 'bg-brand-50 text-brand-600' : 'text-ink-700 hover:bg-ink-100/60']"
    >
      <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m-9 4h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2.5l-1-1h-3l-1 1H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z" />
      </svg>
      {{ t('admin.manageTools') }}
    </NuxtLinkLocale>

    <NuxtLinkLocale
      v-if="isAdmin"
      to="/admin/users"
      :class="['-mt-5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-base font-bold', onUsersPage ? 'bg-brand-50 text-brand-600' : 'text-ink-700 hover:bg-ink-100/60']"
    >
      <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1m20 0v-1a4 4 0 0 0-3-3.87M15 3.13a4 4 0 0 1 0 7.75M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />
      </svg>
      {{ t('admin.users.title') }}
    </NuxtLinkLocale>

    <NuxtLinkLocale
      v-if="isAdmin"
      to="/admin/reviews"
      :class="['-mt-5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-base font-bold', onReviewsPage ? 'bg-brand-50 text-brand-600' : 'text-ink-700 hover:bg-ink-100/60']"
    >
      <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27Z" />
      </svg>
      {{ t('admin.reviews.title') }}
    </NuxtLinkLocale>

    <NuxtLinkLocale
      v-if="isAdmin"
      to="/admin/user-feedback"
      :class="['-mt-5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-base font-bold', onFeedbackPage ? 'bg-brand-50 text-brand-600' : 'text-ink-700 hover:bg-ink-100/60']"
    >
      <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 5h16v11H8l-4 4V5Zm3 4h10m-10 3h6" />
      </svg>
      {{ t('adminFeedback.title') }}
    </NuxtLinkLocale>

    <NuxtLinkLocale
      v-if="isAdmin"
      to="/admin/contact-messages"
      :class="['-mt-5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-base font-bold', onContactPage ? 'bg-brand-50 text-brand-600' : 'text-ink-700 hover:bg-ink-100/60']"
    >
      <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16v12H4V6Zm0 0 8 7 8-7" />
      </svg>
      {{ t('admin.contactMessages') }}
    </NuxtLinkLocale>

    <NuxtLinkLocale
      v-if="isAdmin"
      to="/admin/ads"
      :class="['-mt-5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-base font-bold', onAdsPage ? 'bg-brand-50 text-brand-600' : 'text-ink-700 hover:bg-ink-100/60']"
    >
      <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 19h16M8 15v-4M12 15V9m4 6v-8" />
      </svg>
      {{ t('adminAds.title') }}
    </NuxtLinkLocale>

    <NuxtLinkLocale
      v-if="isAdmin"
      to="/admin/posts"
      :class="['-mt-5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-base font-bold', onPostsPage ? 'bg-brand-50 text-brand-600' : 'text-ink-700 hover:bg-ink-100/60']"
    >
      <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 3h12v18H6V3Zm3 5h6m-6 4h6m-6 4h4" />
      </svg>
      {{ t('adminPosts.title') }}
    </NuxtLinkLocale>

    <NuxtLinkLocale
      v-if="isAdmin"
      to="/admin/gpts"
      :class="['-mt-5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-base font-bold', onGptsPage ? 'bg-brand-50 text-brand-600' : 'text-ink-700 hover:bg-ink-100/60']"
    >
      <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 2 2 7l10 5 10-5-10-5Zm0 10L2 7v10l10 5 10-5V7l-10 5Z" />
      </svg>
      {{ t('adminGpts.title') }}
    </NuxtLinkLocale>

    <div>
      <div class="px-3 text-[11px] font-semibold uppercase tracking-wide text-ink-400">{{ t('admin.research') }}</div>
      <div class="mt-2 flex flex-col gap-0.5">
        <NuxtLinkLocale
          v-for="item in researchItems"
          :key="item.label"
          :to="item.to"
          :class="['flex items-center gap-2.5 rounded-lg px-3 py-2 text-base font-semibold', basePath === item.to || basePath.startsWith(item.to + '/') ? 'bg-brand-50 text-brand-600' : 'text-ink-700 hover:bg-ink-100/60']"
        >
          <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
          </svg>
          {{ item.label }}
        </NuxtLinkLocale>
      </div>
    </div>

    <!-- Plan / quota box is for customers only — admins have no plan. -->
    <div v-if="!isAdmin" class="rounded-xl border border-ink-100 bg-ink-100/30 p-3.5 text-[14px]">
      <div class="font-bold text-ink-800">{{ planLabel }}</div>
      <div class="mt-3 flex items-center justify-between gap-2 text-ink-500">
        <span>{{ t('admin.websiteInsightsQuota') }}</span>
        <span v-if="myPlan" class="shrink-0 text-xs">{{ nf.format(myPlan.usage.dataCredits.used) }}/{{ nf.format(myPlan.usage.dataCredits.limit) }}</span>
      </div>
      <div class="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ink-200">
        <div class="h-full rounded-full bg-brand-400" :style="{ width: `${quotaPct(myPlan?.usage.dataCredits)}%` }"></div>
      </div>
      <div class="mt-2.5 flex items-center justify-between gap-2 text-ink-500">
        <span>{{ t('admin.socialListeningQueries') }}</span>
        <span v-if="myPlan" class="shrink-0 text-xs">{{ nf.format(myPlan.usage.socialQueries.used) }}/{{ nf.format(myPlan.usage.socialQueries.limit) }}</span>
      </div>
      <div class="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ink-200">
        <div class="h-full rounded-full bg-emerald-400" :style="{ width: `${quotaPct(myPlan?.usage.socialQueries)}%` }"></div>
      </div>
      <button type="button" class="mt-3 flex items-center gap-1 font-bold text-brand-500 hover:text-brand-600" @click="upgradeModalOpen = true">
        <svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2 3 12h5l-1 6 8-10h-5l1-6Z" /></svg>
        {{ myPlan && myPlan.plan !== 'FREE' ? t('admin.managePlan') : t('admin.upgrade') }}
      </button>
    </div>

    <div v-if="businessItems.length">
      <div class="px-3 text-[11px] font-semibold uppercase tracking-wide text-ink-400">{{ t('admin.business') }}</div>
      <div class="mt-2 flex flex-col gap-0.5">
        <NuxtLinkLocale
          v-for="item in businessItems"
          :key="item.label"
          :to="item.to"
          :class="['flex items-center gap-2.5 rounded-lg px-3 py-2 text-base font-semibold', basePath === item.to || basePath.startsWith(item.to + '/') ? 'bg-brand-50 text-brand-600' : 'text-ink-700 hover:bg-ink-100/60']"
        >
          <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
          </svg>
          {{ item.label }}
        </NuxtLinkLocale>
      </div>
    </div>

    <div>
      <div class="px-3 text-[11px] font-semibold uppercase tracking-wide text-ink-400">{{ t('admin.other') }}</div>
      <div class="mt-2 flex flex-col gap-0.5">
        <NuxtLinkLocale
          v-for="item in otherItems"
          :key="item.label"
          :to="item.to"
          :class="['flex items-center gap-2.5 rounded-lg px-3 py-2 text-base font-semibold', basePath === item.to || basePath.startsWith(item.to + '/') ? 'bg-brand-50 text-brand-600' : 'text-ink-700 hover:bg-ink-100/60']"
        >
          <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
          </svg>
          {{ item.label }}
        </NuxtLinkLocale>
      </div>
    </div>

    <div class="mt-auto flex items-center gap-2.5 rounded-lg border border-ink-100 px-3 py-2.5">
      <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">{{ accountInitial }}</span>
      <span class="min-w-0 flex-1">
        <span class="block truncate text-xs font-bold text-ink-900">{{ accountName }}</span>
        <span class="block truncate text-[11px] text-ink-400">{{ accountSubtitle }}</span>
      </span>
      <AccountMenu
        placement="side"
        button-class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-900 data-[open]:bg-ink-100 data-[open]:text-ink-900"
      >
        <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.75" /><circle cx="12" cy="12" r="1.75" /><circle cx="12" cy="19" r="1.75" /></svg>
      </AccountMenu>
    </div>
  </aside>

  <UpgradeModal :open="upgradeModalOpen" @close="upgradeModalOpen = false" />
</template>

<style scoped>
.no-scrollbar {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>
