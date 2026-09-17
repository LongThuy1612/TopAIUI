<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const { setSession } = useAuth()

const redirect = computed(() => (typeof route.query.redirect === 'string' ? route.query.redirect : '/'))

const email = ref('')
const password = ref('')
const rememberMe = ref(false)
const loading = ref(false)
const error = ref('')

async function submit() {
  if (!email.value.trim() || !password.value.trim()) return
  loading.value = true
  error.value = ''
  try {
    const res = await $fetch<{ token: string; user: { id: string; email: string; name: string | null } }>('/api/auth/login', {
      method: 'POST',
      body: { email: email.value.trim(), password: password.value }
    })
    setSession(res.token, res.user, rememberMe.value)
    await navigateTo(redirect.value)
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number })?.statusCode
    if (statusCode === 401) {
      error.value = t('auth.invalidCredentials')
    } else if (statusCode === 403) {
      error.value = t('auth.accountBanned')
    } else {
      error.value = t('auth.registerError')
    }
  } finally {
    loading.value = false
  }
}

useSeoMeta({ title: () => `${t('auth.signInTitle')} — TopAICollection` })
</script>

<template>
  <div class="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-16 sm:px-6">
    <NuxtLink to="/" class="flex items-center gap-2.5">
      <IconLogo class="h-9 w-9 rounded-[11px]" width="36" height="36" />
      <span class="text-2xl font-extrabold tracking-[-0.02em] text-ink-900">TopAI<span class="text-brand-500">Collection</span></span>
    </NuxtLink>

    <h1 class="mt-8 text-2xl font-extrabold text-ink-900">{{ t('auth.signInTitle') }}</h1>

    <div class="mt-8 w-full">
      <p class="text-sm font-semibold text-ink-600">{{ t('auth.signInWith') }}</p>

      <button
        type="button"
        class="mt-3 flex w-full items-center justify-center gap-2.5 rounded-xl border border-ink-200 bg-white py-3 text-sm font-semibold text-ink-800 transition hover:border-ink-300 hover:bg-ink-100/40"
      >
        <svg class="h-5 w-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47c-.28 1.5-1.13 2.78-2.4 3.63v3.02h3.88c2.27-2.09 3.57-5.17 3.57-8.84Z" />
          <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3.02c-1.07.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.26v3.11A11.99 11.99 0 0 0 12 24Z" />
          <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.26A11.99 11.99 0 0 0 0 12c0 1.94.46 3.77 1.26 5.39l4.01-3.11Z" />
          <path fill="#EA4335" d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.26 6.61l4.01 3.11C6.22 6.88 8.87 4.77 12 4.77Z" />
        </svg>
        {{ t('auth.continueWithGoogle') }}
      </button>

      <div class="my-5 flex items-center gap-3">
        <div class="h-px flex-1 bg-ink-200"></div>
        <span class="text-xs font-medium text-ink-500">{{ t('auth.orContinueWith') }}</span>
        <div class="h-px flex-1 bg-ink-200"></div>
      </div>

      <form class="space-y-4" @submit.prevent="submit">
        <div>
          <label class="mb-1.5 block text-sm font-semibold text-ink-900">
            <span class="text-red-500">*</span> {{ t('auth.emailLabel') }}
          </label>
          <input
            v-model="email"
            type="email"
            :placeholder="t('auth.emailPlaceholder')"
            required
            class="w-full rounded-xl border border-ink-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
          >
        </div>

        <div>
          <label class="mb-1.5 block text-sm font-semibold text-ink-900">
            <span class="text-red-500">*</span> {{ t('auth.passwordLabel') }}
          </label>
          <input
            v-model="password"
            type="password"
            :placeholder="t('auth.passwordPlaceholder')"
            required
            class="w-full rounded-xl border border-ink-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
          >
        </div>

        <div class="flex items-center justify-between text-sm">
          <label class="flex items-center gap-2 text-ink-700">
            <input v-model="rememberMe" type="checkbox" class="h-4 w-4 rounded border-ink-300 text-brand-500 focus:ring-brand-400">
            {{ t('auth.rememberMe') }}
          </label>
          <NuxtLink to="/forgetPassword" class="font-semibold text-brand-500 hover:text-brand-600">{{ t('auth.forgotPassword') }}</NuxtLink>
        </div>

        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

        <button
          :disabled="loading"
          class="w-full rounded-xl bg-brand-500 py-3 text-sm font-bold text-white transition hover:bg-brand-600 disabled:opacity-50"
        >
          {{ loading ? '…' : t('auth.signIn') }}
        </button>
      </form>

      <p class="mt-5 text-center text-sm text-ink-600">
        {{ t('auth.noAccount') }} <NuxtLink :to="{ path: '/register', query: route.query }" class="font-semibold text-brand-500 hover:text-brand-600">{{ t('auth.signUp') }}</NuxtLink>
      </p>
    </div>

    <LanguageSwitcher class="mt-8" />
  </div>
</template>
