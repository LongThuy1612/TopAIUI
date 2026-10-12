<script setup lang="ts">
const { t } = useI18n()

const email = ref('')
const loading = ref(false)
const sent = ref(false)
const error = ref('')
// Shown with a "Sign up" link when no account uses the address.
const notRegistered = ref(false)

const errorKeys: Record<number, string> = {
  400: 'auth.invalidEmail',
  403: 'auth.accountBanned',
  404: 'auth.emailNotRegistered',
  429: 'account.verifyWait',
  502: 'account.verifyError'
}

async function submit() {
  if (!email.value.trim() || loading.value) return
  loading.value = true
  error.value = ''
  notRegistered.value = false
  try {
    await $fetch('/api/auth/forgot-password', { method: 'POST', body: { email: email.value.trim() } })
    sent.value = true
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number })?.statusCode ?? 0
    notRegistered.value = statusCode === 404
    error.value = t(errorKeys[statusCode] ?? 'auth.registerError')
  } finally {
    loading.value = false
  }
}

useSeoMeta({ title: () => `${t('auth.resetPasswordTitle')} — TopAICollection` })
</script>

<template>
  <div class="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-16 sm:px-6">
    <NuxtLink to="/" class="flex items-center gap-2.5">
      <IconLogo class="h-9 w-9 rounded-[11px]" width="36" height="36" />
      <span class="text-2xl font-extrabold tracking-[-0.02em] text-ink-900">TopAI<span class="text-brand-500">Collection</span></span>
    </NuxtLink>

    <h1 class="mt-8 text-2xl font-extrabold text-ink-900">{{ t('auth.resetPasswordTitle') }}</h1>

    <div class="mt-8 w-full">
      <p v-if="sent" class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
        {{ t('auth.resetPasswordSent', { email: email.trim() }) }}
      </p>

      <form v-else class="space-y-4" @submit.prevent="submit">
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

        <p v-if="error" class="text-sm text-red-600">
          {{ error }}
          <NuxtLink v-if="notRegistered" to="/register" class="font-semibold text-brand-500 hover:text-brand-600">{{ t('auth.signUp') }}</NuxtLink>
        </p>

        <button
          :disabled="loading"
          class="w-full rounded-xl bg-brand-500 py-3 text-sm font-bold text-white transition hover:bg-brand-600 disabled:opacity-50"
        >
          {{ loading ? '…' : t('auth.send') }}
        </button>
      </form>

      <p class="mt-5 text-center text-sm text-ink-600">
        <NuxtLink to="/login" class="font-semibold text-brand-500 hover:text-brand-600">{{ t('auth.backToSignIn') }}</NuxtLink>
      </p>
    </div>

    <LanguageSwitcher class="mt-8" />
  </div>
</template>
