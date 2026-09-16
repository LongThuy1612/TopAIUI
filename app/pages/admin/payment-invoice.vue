<script setup lang="ts">
const { t } = useI18n()
const { token, load } = useAdminAuth()
load()

if (import.meta.client && !token.value) {
  await navigateTo('/admin/login')
}

const upgradeModalOpen = ref(false)

const profile = ref({
  email: 'bigbossabc1@gmail.com',
  userName: 'boss big',
  company: '',
  country: '',
  phone: '',
  city: '',
  state: '',
  zip: '',
  address: '',
  vatNumber: ''
})

useSeoMeta({
  title: () => `${t('paymentInvoicePage.title')} — TopAICollection`
})
</script>

<template>
  <div class="flex min-h-[calc(100vh-64px)] w-full">
    <AdminSidebar />

    <div class="min-w-0 flex-1 px-6 py-6 lg:px-8">
      <h1 class="text-xl font-extrabold text-ink-900">{{ t('paymentInvoicePage.title') }}</h1>

      <div class="mt-4 grid grid-cols-1 gap-6 rounded-xl border border-ink-100 p-6 lg:grid-cols-2 lg:divide-x lg:divide-ink-100">
        <div class="lg:pr-6">
          <h2 class="text-lg font-extrabold text-ink-900">{{ t('paymentInvoicePage.research') }}</h2>

          <div class="mt-4 flex items-center justify-between text-sm font-semibold text-ink-900">
            <span>{{ t('paymentInvoicePage.monthlyQueries') }}</span>
            <span>--</span>
          </div>
          <div class="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-ink-100">
            <div class="h-full w-full rounded-full bg-blue-400"></div>
          </div>

          <div class="mt-4 flex items-center justify-between text-sm font-semibold text-ink-900">
            <span>{{ t('paymentInvoicePage.socialListeningQueries') }}</span>
            <span>100/100</span>
          </div>
          <div class="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-ink-100">
            <div class="h-full w-full rounded-full bg-emerald-400"></div>
          </div>

          <button
            type="button"
            class="mt-5 w-full rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-bold text-brand-600 hover:bg-brand-100"
            @click="upgradeModalOpen = true"
          >
            {{ t('paymentInvoicePage.selectPlan') }}
          </button>
        </div>

        <div class="lg:pl-6">
          <h2 class="text-lg font-extrabold text-ink-900">{{ t('paymentInvoicePage.subscription') }}</h2>

          <div class="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div class="text-ink-900"><span class="font-semibold">{{ t('paymentInvoicePage.subscriptionPlan') }}:</span> Free</div>
            <div class="text-ink-900"><span class="font-semibold">{{ t('paymentInvoicePage.subscriptionCard') }}:</span> --</div>
            <div class="text-ink-900"><span class="font-semibold">{{ t('paymentInvoicePage.nextChargeAmount') }}:</span> --</div>
            <div class="text-ink-900"><span class="font-semibold">{{ t('paymentInvoicePage.nextChargeDate') }}:</span> --</div>
          </div>

          <div class="mt-5 flex flex-wrap gap-3">
            <button type="button" disabled class="cursor-not-allowed rounded-lg bg-ink-100 px-4 py-2.5 text-sm font-bold text-ink-400">
              {{ t('paymentInvoicePage.changeCard') }}
            </button>
            <button type="button" disabled class="cursor-not-allowed rounded-lg bg-ink-100 px-4 py-2.5 text-sm font-bold text-ink-400">
              {{ t('paymentInvoicePage.unsubscribe') }}
            </button>
          </div>
        </div>
      </div>

      <h2 class="mt-8 text-lg font-extrabold text-ink-900">{{ t('paymentInvoicePage.profileTitle') }}</h2>

      <form class="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-ink-100 p-6 sm:grid-cols-2" @submit.prevent>
        <label class="block">
          <span class="mb-1 block text-sm font-semibold text-ink-900"><span class="text-red-500">*</span> {{ t('paymentInvoicePage.fieldEmail') }}</span>
          <input v-model="profile.email" type="email" required class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400">
        </label>
        <label class="block">
          <span class="mb-1 block text-sm font-semibold text-ink-900">{{ t('paymentInvoicePage.fieldUserName') }}</span>
          <input v-model="profile.userName" type="text" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400">
        </label>

        <label class="block sm:col-span-2">
          <span class="mb-1 block text-sm font-semibold text-ink-900">{{ t('paymentInvoicePage.fieldCompany') }}</span>
          <input v-model="profile.company" type="text" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400">
        </label>

        <label class="block">
          <span class="mb-1 block text-sm font-semibold text-ink-900">{{ t('paymentInvoicePage.fieldCountry') }}</span>
          <select v-model="profile.country" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400">
            <option value=""></option>
          </select>
        </label>
        <label class="block">
          <span class="mb-1 block text-sm font-semibold text-ink-900">{{ t('paymentInvoicePage.fieldPhone') }}</span>
          <input v-model="profile.phone" type="text" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400">
        </label>

        <label class="block">
          <span class="mb-1 block text-sm font-semibold text-ink-900">{{ t('paymentInvoicePage.fieldCity') }}</span>
          <input v-model="profile.city" type="text" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400">
        </label>
        <label class="block">
          <span class="mb-1 block text-sm font-semibold text-ink-900">{{ t('paymentInvoicePage.fieldState') }}</span>
          <input v-model="profile.state" type="text" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400">
        </label>

        <label class="block">
          <span class="mb-1 block text-sm font-semibold text-ink-900">{{ t('paymentInvoicePage.fieldZip') }}</span>
          <input v-model="profile.zip" type="text" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400">
        </label>
        <label class="block">
          <span class="mb-1 block text-sm font-semibold text-ink-900">{{ t('paymentInvoicePage.fieldVatNumber') }}</span>
          <input v-model="profile.vatNumber" type="text" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400">
        </label>

        <label class="block sm:col-span-2">
          <span class="mb-1 block text-sm font-semibold text-ink-900">{{ t('paymentInvoicePage.fieldAddress') }}</span>
          <input v-model="profile.address" type="text" class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400">
        </label>

        <div class="sm:col-span-2">
          <button type="submit" class="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-600">
            {{ t('paymentInvoicePage.save') }}
          </button>
        </div>
      </form>
    </div>

    <AdminUpgradeModal :open="upgradeModalOpen" @close="upgradeModalOpen = false" />
  </div>
</template>
