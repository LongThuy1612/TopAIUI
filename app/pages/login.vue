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

// Hidden too when Google's script is blocked, so the divider doesn't dangle.
const googleEnabled = ref(!!useRuntimeConfig().public.googleClientId)

function onGoogleError(statusCode: number | undefined) {
  error.value = statusCode === 403
    ? t('auth.accountBanned')
    : statusCode === 409 ? t('auth.googleEmailInUse') : t('auth.registerError')
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
      <template v-if="googleEnabled">
        <p class="text-sm font-semibold text-ink-600">{{ t('auth.signInWith') }}</p>

        <GoogleSignInButton
          class="mt-3"
          text="continue_with"
          :remember="rememberMe"
          @signed-in="navigateTo(redirect)"
          @error="onGoogleError"
          @unavailable="googleEnabled = false"
        />

        <div class="my-5 flex items-center gap-3">
          <div class="h-px flex-1 bg-ink-200"></div>
          <span class="text-xs font-medium text-ink-500">{{ t('auth.orContinueWith') }}</span>
          <div class="h-px flex-1 bg-ink-200"></div>
        </div>
      </template>

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
