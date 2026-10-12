<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const { user, authHeaders } = useAuth()

// Confirming needs the account's own session (see server/api/auth/verify-email.post.ts);
// not signed in → login, then back here with the token.
definePageMeta({ middleware: 'auth' })

// From the emailed link: /verify-email?token=…
const token = typeof route.query.token === 'string' ? route.query.token : ''
const state = ref<'pending' | 'done' | 'invalid' | 'wrongAccount'>(token ? 'pending' : 'invalid')

onMounted(async () => {
  if (!token) return
  try {
    await $fetch('/api/auth/verify-email', { method: 'POST', headers: authHeaders(), body: { token } })
    state.value = 'done'
    // Hides the dashboard banner without a reload.
    if (user.value) user.value = { ...user.value, emailVerified: true }
  } catch (err: unknown) {
    state.value = (err as { statusCode?: number })?.statusCode === 403 ? 'wrongAccount' : 'invalid'
  }
})

useSeoMeta({ title: () => `${t('auth.verifyEmailTitle')} — TopAICollection`, robots: 'noindex' })
</script>

<template>
  <div class="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-16 sm:px-6">
    <NuxtLink to="/" class="flex items-center gap-2.5">
      <IconLogo class="h-9 w-9 rounded-[11px]" width="36" height="36" />
      <span class="text-2xl font-extrabold tracking-[-0.02em] text-ink-900">TopAI<span class="text-brand-500">Collection</span></span>
    </NuxtLink>

    <h1 class="mt-8 text-2xl font-extrabold text-ink-900">{{ t('auth.verifyEmailTitle') }}</h1>

    <div class="mt-8 w-full text-center">
      <p v-if="state === 'pending'" class="text-sm text-ink-600">{{ t('auth.verifyingEmail') }}</p>
      <p v-else-if="state === 'done'" class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
        {{ t('auth.emailVerified') }}
      </p>
      <p v-else-if="state === 'wrongAccount'" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {{ t('auth.verifyWrongAccount', { email: user?.email ?? '' }) }}
      </p>
      <p v-else class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {{ t('auth.verifyLinkInvalid') }}
      </p>

      <NuxtLink
        v-if="state !== 'pending'"
        to="/dashboard"
        class="mt-6 inline-block rounded-xl bg-brand-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-600"
      >
        {{ t('auth.goToDashboard') }}
      </NuxtLink>
    </div>
  </div>
</template>
