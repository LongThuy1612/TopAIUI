<script setup lang="ts">
import type { AuthUser } from '~/composables/useAuth'

const { t, locale } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const { setSession } = useAuth()

const redirect = computed(() => (typeof route.query.redirect === 'string' ? route.query.redirect : localePath('/')))

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function submit() {
  if (!email.value.trim() || !password.value.trim()) return
  loading.value = true
  error.value = ''
  try {
    const res = await $fetch<{ token: string; user: AuthUser }>('/api/auth/register', {
      method: 'POST',
      body: { email: email.value.trim(), password: password.value, locale: locale.value }
    })
    setSession(res.token, res.user)
    await navigateTo(redirect.value)
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number })?.statusCode
    const statusMessage = (err as { statusMessage?: string })?.statusMessage
    if (statusCode === 409) {
      error.value = t('auth.emailInUse')
    } else if (statusCode === 400 && statusMessage) {
      error.value = statusMessage
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

useSeoMeta({ title: () => `${t('auth.signUpTitle')} — TopAICollection` })
</script>

<template>
  <div class="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-16 sm:px-6">
    <NuxtLinkLocale to="/" class="flex items-center gap-2.5">
      <IconLogo class="h-9 w-9 rounded-[11px]" width="36" height="36" />
      <span class="text-2xl font-extrabold tracking-[-0.02em] text-ink-900">TopAI<span class="text-brand-500">Collection</span></span>
    </NuxtLinkLocale>

    <h1 class="mt-8 text-2xl font-extrabold text-ink-900">{{ t('auth.signUpTitle') }}</h1>

    <div class="mt-8 w-full">
      <template v-if="googleEnabled">
        <GoogleSignInButton
          text="signup_with"
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
            minlength="6"
            class="w-full rounded-xl border border-ink-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
          >
          <p class="mt-1 text-xs text-ink-500">{{ t('auth.passwordMinLength') }}</p>
        </div>

        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

        <button
          :disabled="loading"
          class="w-full rounded-xl bg-brand-500 py-3 text-sm font-bold text-white transition hover:bg-brand-600 disabled:opacity-50"
        >
          {{ loading ? '…' : t('auth.signUp') }}
        </button>
      </form>

      <p class="mt-5 text-center text-sm text-ink-600">
        {{ t('auth.hasAccount') }} <NuxtLinkLocale :to="{ path: '/login', query: route.query }" class="font-semibold text-brand-500 hover:text-brand-600">{{ t('auth.signIn') }}</NuxtLinkLocale>
      </p>
    </div>

    <LanguageSwitcher class="mt-8" />
  </div>
</template>
