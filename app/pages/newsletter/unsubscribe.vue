<script setup lang="ts">
// From the newsletter's "Unsubscribe" link: /newsletter/unsubscribe?s=…&t=…. A button,
// not an automatic call — mail scanners open every link in a mail.
const { t } = useI18n()
const route = useRoute()

const s = typeof route.query.s === 'string' ? route.query.s : ''
const tk = typeof route.query.t === 'string' ? route.query.t : ''
const state = ref<'ready' | 'busy' | 'done' | 'invalid'>(s && tk ? 'ready' : 'invalid')

async function unsubscribe() {
  if (state.value !== 'ready') return
  state.value = 'busy'
  try {
    await $fetch('/api/newsletter/unsubscribe', { method: 'POST', query: { s, t: tk } })
    state.value = 'done'
  } catch {
    state.value = 'invalid'
  }
}

useSeoMeta({ title: () => `${t('newsletterUnsub.title')} — TopAICollection`, robots: 'noindex' })
</script>

<template>
  <div class="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center sm:px-6">
    <h1 class="text-2xl font-extrabold text-ink-900">{{ t('newsletterUnsub.title') }}</h1>

    <template v-if="state === 'ready' || state === 'busy'">
      <p class="mt-3 text-sm text-ink-600">{{ t('newsletterUnsub.text') }}</p>
      <button
        type="button"
        :disabled="state === 'busy'"
        class="mt-8 rounded-full bg-brand-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-600 disabled:opacity-60"
        @click="unsubscribe"
      >
        {{ t('newsletterUnsub.button') }}
      </button>
    </template>
    <p v-else-if="state === 'done'" class="mt-8 w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
      {{ t('newsletterUnsub.done') }}
    </p>
    <p v-else class="mt-8 w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ t('newsletterUnsub.invalid') }}
    </p>

    <NuxtLinkLocale to="/" class="mt-6 text-sm font-semibold text-ink-700 hover:text-ink-900">{{ t('newsletterUnsub.home') }}</NuxtLinkLocale>
  </div>
</template>
