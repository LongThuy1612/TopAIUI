<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const { userName, load, login } = useMockAuth()
load()

const redirect = computed(() => (typeof route.query.redirect === 'string' ? route.query.redirect : '/'))

if (import.meta.client && userName.value) {
  await navigateTo(redirect.value)
}

const name = ref('')
const loading = ref(false)

function submit() {
  if (!name.value.trim()) return
  loading.value = true
  login(name.value.trim())
  navigateTo(redirect.value)
}

useSeoMeta({ title: () => `${t('tool.loginToReview')} — TopAICollection` })
</script>

<template>
  <div class="mx-auto max-w-sm px-4 py-20 sm:px-6 lg:px-8">
    <h1 class="text-xl font-bold text-ink-900">{{ t('tool.loginToReview') }}</h1>
    <form class="mt-6 space-y-4" @submit.prevent="submit">
      <input
        v-model="name"
        type="text"
        placeholder="Your name"
        required
        class="w-full rounded-lg border border-ink-200 px-3 py-2 text-base outline-none focus:border-brand-400"
      >
      <button
        :disabled="loading"
        class="w-full rounded-full bg-brand-500 py-2.5 text-base font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
      >
        {{ loading ? '…' : t('tool.loginToReview') }}
      </button>
    </form>
  </div>
</template>
