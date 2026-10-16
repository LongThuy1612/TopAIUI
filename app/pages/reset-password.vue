<script setup lang="ts">
import type { AuthUser } from '~/composables/useAuth'

const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const { setSession } = useAuth()

// From the emailed link: /reset-password?token=…
const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))

const password = ref('')
const confirm = ref('')
const loading = ref(false)
const error = ref('')

async function submit() {
  if (loading.value) return
  if (password.value.length < 6) {
    error.value = t('auth.passwordMinLength')
    return
  }
  if (password.value !== confirm.value) {
    error.value = t('auth.passwordMismatch')
    return
  }
  loading.value = true
  error.value = ''
  try {
    const res = await $fetch<{ token: string; user: AuthUser }>('/api/auth/reset-password', {
      method: 'POST',
      body: { token: token.value, password: password.value }
    })
    // Every other session was just signed out; this one starts fresh.
    setSession(res.token, res.user)
    await navigateTo(localePath('/dashboard'))
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number })?.statusCode
    error.value = statusCode === 403
      ? t('auth.accountBanned')
      : statusCode === 400 ? t('auth.resetLinkInvalid') : t('auth.registerError')
  } finally {
    loading.value = false
  }
}

useSeoMeta({ title: () => `${t('auth.newPasswordTitle')} — TopAICollection`, robots: 'noindex' })
</script>

<template>
  <div class="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-16 sm:px-6">
    <NuxtLinkLocale to="/" class="flex items-center gap-2.5">
      <IconLogo class="h-9 w-9 rounded-[11px]" width="36" height="36" />
      <span class="text-2xl font-extrabold tracking-[-0.02em] text-ink-900">TopAICollection</span>
    </NuxtLinkLocale>

    <h1 class="mt-8 text-2xl font-extrabold text-ink-900">{{ t('auth.newPasswordTitle') }}</h1>

    <div class="mt-8 w-full">
      <p v-if="!token" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {{ t('auth.resetLinkInvalid') }}
      </p>

      <form v-else class="space-y-4" @submit.prevent="submit">
        <div>
          <label class="mb-1.5 block text-sm font-semibold text-ink-900">
            <span class="text-red-500">*</span> {{ t('auth.newPasswordLabel') }}
          </label>
          <input
            v-model="password"
            type="password"
            autocomplete="new-password"
            minlength="6"
            maxlength="200"
            required
            class="w-full rounded-xl border border-ink-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
          >
          <p class="mt-1 text-xs text-ink-500">{{ t('auth.passwordMinLength') }}</p>
        </div>

        <div>
          <label class="mb-1.5 block text-sm font-semibold text-ink-900">
            <span class="text-red-500">*</span> {{ t('auth.confirmPasswordLabel') }}
          </label>
          <input
            v-model="confirm"
            type="password"
            autocomplete="new-password"
            maxlength="200"
            required
            class="w-full rounded-xl border border-ink-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
          >
        </div>

        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

        <button
          :disabled="loading"
          class="w-full rounded-xl bg-brand-500 py-3 text-sm font-bold text-white transition hover:bg-brand-600 disabled:opacity-50"
        >
          {{ loading ? '…' : t('auth.setNewPassword') }}
        </button>
      </form>

      <p class="mt-5 text-center text-sm text-ink-600">
        <NuxtLinkLocale to="/forgetPassword" class="font-semibold text-brand-500 hover:text-brand-600">{{ t('auth.requestNewLink') }}</NuxtLinkLocale>
      </p>
    </div>

    <LanguageSwitcher class="mt-8" />
  </div>
</template>
