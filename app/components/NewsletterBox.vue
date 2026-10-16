<script setup lang="ts">
// "Get the best AI tools, weekly" (home sidebar): stores the address (POST /api/newsletter).
const { t, locale } = useI18n()
const { authHeaders, load: loadAuth } = useAuth()

const email = ref('')
const website = ref('') // never shown: bots fill it in
const state = ref<'idle' | 'busy' | 'done' | 'error'>('idle')
const message = ref('')

async function subscribe() {
  if (state.value === 'busy') return
  state.value = 'busy'
  loadAuth()
  try {
    await $fetch('/api/newsletter', { method: 'POST', headers: authHeaders(), body: { email: email.value, locale: locale.value, website: website.value } })
    state.value = 'done'
    message.value = t('home.subscribed')
    email.value = ''
  } catch (e: any) {
    state.value = 'error'
    message.value = e?.statusCode === 429 ? t('home.subscribeLater') : t('home.subscribeInvalid')
  }
}
</script>

<template>
  <div class="flex flex-col gap-2.5 rounded-[22px] bg-[#FFEBE4] p-[22px]">
    <span class="text-[17px] font-bold text-ink-900">{{ t('home.newsletterTitle') }}</span>
    <span class="text-sm text-[#6B5B55]">{{ t('home.newsletterSub') }}</span>
    <form class="flex items-center gap-1.5 rounded-full bg-white py-[5px] pr-[5px] pl-3.5" @submit.prevent="subscribe">
      <input v-model="website" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" class="hidden">
      <input
        v-model="email"
        type="email"
        required
        maxlength="254"
        :placeholder="t('home.newsletterPlaceholder')"
        :aria-label="t('home.newsletterPlaceholder')"
        class="min-w-0 flex-1 border-none bg-transparent text-sm text-ink-900 outline-none"
      >
      <button type="submit" :disabled="state === 'busy'" class="rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
        {{ t('home.subscribe') }}
      </button>
    </form>
    <span v-if="message" :class="['text-xs', state === 'done' ? 'text-emerald-700' : 'text-red-600']" role="status">{{ message }}</span>
  </div>
</template>
