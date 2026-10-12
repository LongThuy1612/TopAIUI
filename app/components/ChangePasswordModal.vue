<script setup lang="ts">
// Sidebar account menu → change password, or set a first one on a Google-only account.
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const { user, authHeaders, replaceToken } = useAuth()

// Read when the dialog opens, so the title doesn't flip from "Set" to "Change"
// under the success message.
const hasPassword = ref(true)

const current = ref('')
const next = ref('')
const confirm = ref('')
const saving = ref(false)
const message = ref<{ ok: boolean; text: string } | null>(null)

// Every opening starts clean: no half-typed passwords or old messages.
watch(() => props.open, (open) => {
  if (!open) return
  hasPassword.value = user.value?.hasPassword !== false
  current.value = next.value = confirm.value = ''
  message.value = null
})

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open) emit('close')
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

async function submit() {
  if (saving.value) return
  if (next.value.length < 6) {
    message.value = { ok: false, text: t('auth.passwordMinLength') }
    return
  }
  if (next.value !== confirm.value) {
    message.value = { ok: false, text: t('auth.passwordMismatch') }
    return
  }
  saving.value = true
  message.value = null
  try {
    const res = await $fetch<{ token: string; user: { hasPassword: boolean } }>('/api/me/password', {
      method: 'POST',
      headers: authHeaders(),
      body: { currentPassword: current.value, newPassword: next.value }
    })
    // The old token stopped working with the change; keep this device signed in.
    replaceToken(res.token)
    if (user.value) user.value = { ...user.value, hasPassword: res.user.hasPassword }
    current.value = next.value = confirm.value = ''
    message.value = { ok: true, text: t('account.passwordChanged') }
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number })?.statusCode
    message.value = { ok: false, text: statusCode === 422 ? t('account.currentPasswordWrong') : t('auth.registerError') }
  } finally {
    saving.value = false
  }
}

const inputClass = 'w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400'
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 px-4 py-8" @click.self="emit('close')">
      <div role="dialog" aria-modal="true" aria-labelledby="change-password-title" class="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <button
          type="button"
          :title="t('admin.upgradeModal.close')"
          class="absolute right-5 top-5 text-ink-400 hover:text-ink-700"
          @click="emit('close')"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
        </button>

        <h2 id="change-password-title" class="pr-8 text-lg font-extrabold text-ink-900">{{ hasPassword ? t('account.changePasswordTitle') : t('account.setPasswordTitle') }}</h2>
        <p v-if="!hasPassword" class="mt-1 text-sm text-ink-500">{{ t('account.setPasswordHint') }}</p>

        <form class="mt-5 space-y-4" @submit.prevent="submit">
          <!-- Lets password managers pair the new password with the account. -->
          <input :value="user?.email ?? ''" type="email" autocomplete="username" class="hidden" readonly>

          <label v-if="hasPassword" class="block">
            <span class="mb-1 block text-sm font-semibold text-ink-900">{{ t('account.currentPassword') }}</span>
            <input v-model="current" type="password" autocomplete="current-password" required :class="inputClass">
          </label>
          <label class="block">
            <span class="mb-1 block text-sm font-semibold text-ink-900">{{ t('auth.newPasswordLabel') }}</span>
            <input v-model="next" type="password" autocomplete="new-password" minlength="6" maxlength="200" required :class="inputClass">
            <span class="mt-1 block text-xs text-ink-500">{{ t('auth.passwordMinLength') }}</span>
          </label>
          <label class="block">
            <span class="mb-1 block text-sm font-semibold text-ink-900">{{ t('auth.confirmPasswordLabel') }}</span>
            <input v-model="confirm" type="password" autocomplete="new-password" maxlength="200" required :class="inputClass">
          </label>

          <p v-if="message" :class="['text-sm font-semibold', message.ok ? 'text-emerald-600' : 'text-red-600']" :role="message.ok ? 'status' : 'alert'">{{ message.text }}</p>

          <button
            type="submit"
            class="w-full rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="saving || !user"
          >
            {{ saving ? '…' : hasPassword ? t('account.changePasswordButton') : t('account.setPasswordButton') }}
          </button>
          <p class="text-xs text-ink-500">{{ t('account.signsOutOthers') }}</p>
        </form>
      </div>
    </div>
  </Teleport>
</template>
