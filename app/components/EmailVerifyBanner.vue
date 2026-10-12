<script setup lang="ts">
// Dashboard notice until the sign-up email address is confirmed.
const { t } = useI18n()
const { user, authHeaders } = useAuth()

const state = ref<'idle' | 'sending' | 'sent' | 'wait' | 'error'>('idle')

async function resend() {
  if (state.value === 'sending') return
  state.value = 'sending'
  try {
    const res = await $fetch<{ sent?: boolean; alreadyVerified?: boolean }>('/api/auth/resend-verification', {
      method: 'POST',
      headers: authHeaders()
    })
    if (res.alreadyVerified && user.value) user.value = { ...user.value, emailVerified: true }
    state.value = 'sent'
  } catch (err: unknown) {
    state.value = (err as { statusCode?: number })?.statusCode === 429 ? 'wait' : 'error'
  }
}
</script>

<template>
  <div
    v-if="user && !user.emailVerified"
    class="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
    role="status"
  >
    <span class="min-w-0 flex-1">{{ t('account.verifyBanner', { email: user.email }) }}</span>
    <span v-if="state === 'sent'" class="font-semibold text-emerald-700">{{ t('account.verifySent') }}</span>
    <template v-else>
      <span v-if="state === 'wait'" class="font-semibold">{{ t('account.verifyWait') }}</span>
      <span v-else-if="state === 'error'" class="font-semibold text-red-600">{{ t('account.verifyError') }}</span>
      <button
        type="button"
        :disabled="state === 'sending'"
        class="rounded-lg bg-amber-100 px-3 py-1.5 font-bold text-amber-900 hover:bg-amber-200 disabled:opacity-50"
        @click="resend"
      >
        {{ t('account.verifyResend') }}
      </button>
    </template>
  </div>
</template>
