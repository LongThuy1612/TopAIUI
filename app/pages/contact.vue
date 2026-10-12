<script setup lang="ts">
import { SUPPORT_EMAIL } from '#shared/site'

const { t, locale } = useI18n()
const { user, load, authHeaders } = useAuth()

const SUBJECTS = ['general', 'support', 'feedback', 'partnership', 'other'] as const
type Subject = typeof SUBJECTS[number]

const form = reactive({ name: '', email: '', subject: '' as '' | Subject, message: '', website: '' })
const sending = ref(false)
const sent = ref(false)
const error = ref('')

// The page HTML is cached and the same for everyone: the signed-in parts (prefill,
// "replies go to…") only appear in the browser.
onMounted(load)
watch(user, (u) => {
  if (!u) return
  if (!form.name) form.name = u.name ?? ''
  form.email = u.email
}, { immediate: true })

const errorKeys: Record<string, string> = {
  NAME: 'contactPage.form.errName',
  EMAIL: 'contactPage.form.errEmail',
  MESSAGE: 'contactPage.form.errMessage',
  RATE_LIMIT: 'contactPage.form.errRateLimit'
}

async function submit() {
  if (sending.value) return
  if (form.message.trim().length < 10) {
    error.value = t('contactPage.form.errMessage')
    return
  }
  sending.value = true
  error.value = ''
  try {
    await $fetch('/api/contact', {
      method: 'POST',
      headers: authHeaders(),
      body: { ...form, subject: form.subject.toUpperCase(), locale: locale.value }
    })
    sent.value = true
  } catch (err: unknown) {
    const code = (err as { data?: { data?: { code?: string } } })?.data?.data?.code ?? ''
    error.value = t(errorKeys[code] ?? 'contactPage.form.error.description')
  } finally {
    sending.value = false
  }
}

function sendAnother() {
  form.subject = ''
  form.message = ''
  sent.value = false
}

const infoItems = [
  { key: 'support', icon: 'M12 8v4l2.5 2.5M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z' },
  { key: 'hours', icon: 'M8 7V3m8 4V3M4 11h16M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z' },
  { key: 'location', icon: 'M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z' }
]

const inputClass = 'w-full rounded-xl border border-ink-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-400'

const abs = useAbsoluteUrl()
const organization = useOrganizationNode()
useBreadcrumbLd(() => [[t('contactPage.title'), '/contact']])
useJsonLd('page', () => ({
  '@context': 'https://schema.org',
  '@type': 'ContactPage',
  name: t('contactPage.meta.title'),
  description: t('contactPage.meta.description'),
  url: abs('/contact'),
  about: organization
}))

useSeoMeta({
  title: () => t('contactPage.meta.title'),
  description: () => t('contactPage.meta.description'),
  ogTitle: () => t('contactPage.meta.title'),
  ogDescription: () => t('contactPage.meta.description')
})
</script>

<template>
  <div class="mx-auto max-w-[1100px] px-4 py-12 sm:px-6 lg:px-8">
    <section class="text-center">
      <h1 class="text-3xl font-extrabold text-ink-900 sm:text-4xl">{{ t('contactPage.title') }}</h1>
      <p class="mx-auto mt-3 max-w-2xl text-ink-600">{{ t('contactPage.subtitle') }}</p>
    </section>

    <div class="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section class="rounded-2xl border border-ink-200 bg-white p-6 sm:p-8">
        <div v-if="sent" class="py-6 text-center" role="status">
          <span class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m5 12.5 4.5 4.5L19 7.5" /></svg>
          </span>
          <h2 class="mt-4 text-xl font-extrabold text-ink-900">{{ t('contactPage.form.success.title') }}</h2>
          <p class="mt-2 text-ink-600">{{ t('contactPage.form.success.description') }}</p>
          <p v-if="user" class="mt-2 text-sm text-ink-500">
            <NuxtLink to="/dashboard/my-inquiries" class="font-semibold text-brand-600 hover:text-brand-700">{{ t('contactPage.form.trackHint') }}</NuxtLink>
          </p>
          <button type="button" class="mt-6 rounded-xl border border-ink-300 px-5 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-100/60" @click="sendAnother">
            {{ t('contactPage.form.sendAnother') }}
          </button>
        </div>

        <form v-else class="space-y-4" @submit.prevent="submit">
          <h2 class="text-lg font-extrabold text-ink-900">{{ t('contactPage.form.title') }}</h2>

          <!-- Honeypot: hidden from people, filled in by bots. -->
          <div class="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
            <label>Website <input v-model="form.website" type="text" name="website" tabindex="-1" autocomplete="off"></label>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label class="block">
              <span class="mb-1.5 block text-sm font-semibold text-ink-900">{{ t('contactPage.form.fields.name.label') }}</span>
              <input v-model="form.name" type="text" required maxlength="100" autocomplete="name" :placeholder="t('contactPage.form.fields.name.placeholder')" :class="inputClass">
            </label>
            <label class="block">
              <span class="mb-1.5 block text-sm font-semibold text-ink-900">{{ t('contactPage.form.fields.email.label') }}</span>
              <input
                v-model="form.email"
                type="email"
                required
                maxlength="254"
                autocomplete="email"
                :readonly="!!user"
                :placeholder="t('contactPage.form.fields.email.placeholder')"
                :class="[inputClass, user && 'cursor-not-allowed bg-ink-100/50 text-ink-600']"
              >
              <span v-if="user" class="mt-1 block text-xs text-ink-500">{{ t('contactPage.form.signedInAs', { email: user.email }) }}</span>
            </label>
          </div>

          <label class="block">
            <span class="mb-1.5 block text-sm font-semibold text-ink-900">{{ t('contactPage.form.fields.subject.label') }}</span>
            <select v-model="form.subject" required :class="inputClass">
              <option value="" disabled>{{ t('contactPage.form.fields.subject.placeholder') }}</option>
              <option v-for="s in SUBJECTS" :key="s" :value="s">{{ t(`contactPage.form.fields.subject.options.${s}`) }}</option>
            </select>
          </label>

          <label class="block">
            <span class="mb-1.5 block text-sm font-semibold text-ink-900">{{ t('contactPage.form.fields.message.label') }}</span>
            <textarea v-model="form.message" required rows="7" minlength="10" maxlength="5000" :placeholder="t('contactPage.form.fields.message.placeholder')" :class="[inputClass, 'resize-y']"></textarea>
            <span class="mt-1 block text-right text-xs text-ink-400">{{ form.message.length }}/5000</span>
          </label>

          <p v-if="error" class="text-sm text-red-600" role="alert">{{ error }}</p>

          <button type="submit" :disabled="sending" class="w-full rounded-xl bg-brand-500 py-3 text-sm font-bold text-white transition hover:bg-brand-600 disabled:opacity-50 sm:w-auto sm:px-8">
            {{ sending ? t('contactPage.form.submitting') : t('contactPage.form.submit') }}
          </button>
        </form>
      </section>

      <aside class="space-y-4">
        <div class="rounded-2xl border border-ink-200 bg-white p-6">
          <h2 class="text-lg font-extrabold text-ink-900">{{ t('contactPage.info.title') }}</h2>
          <div class="mt-4 flex gap-3">
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
              <svg class="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16v12H4V6Zm0 0 8 7 8-7" /></svg>
            </span>
            <div class="min-w-0">
              <div class="text-sm font-bold text-ink-900">{{ t('contactPage.info.email.title') }}</div>
              <a :href="`mailto:${SUPPORT_EMAIL}`" class="break-all text-sm text-brand-600 hover:text-brand-700">{{ SUPPORT_EMAIL }}</a>
            </div>
          </div>
          <div v-for="item in infoItems" :key="item.key" class="mt-4 flex gap-3">
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
              <svg class="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" /></svg>
            </span>
            <div>
              <div class="text-sm font-bold text-ink-900">{{ t(`contactPage.info.${item.key}.title`) }}</div>
              <div class="text-sm text-ink-600">{{ t(`contactPage.info.${item.key}.content`) }}</div>
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-ink-200 bg-white p-6">
          <h2 class="text-lg font-extrabold text-ink-900">{{ t('contactPage.faq.title') }}</h2>
          <div v-for="n in 3" :key="n" class="mt-4">
            <div class="text-sm font-bold text-ink-900">{{ t(`contactPage.faq.q${n}`) }}</div>
            <p class="mt-0.5 text-sm text-ink-600">{{ t(`contactPage.faq.a${n}`) }}</p>
          </div>
          <NuxtLink to="/faq" class="mt-4 inline-block text-sm font-bold text-brand-600 hover:text-brand-700">{{ t('helpPage.sections.faq.link') }} →</NuxtLink>
        </div>
      </aside>
    </div>
  </div>
</template>
