<script setup lang="ts">
const { token, load, setToken } = useAdminAuth()
load()

if (import.meta.client && token.value) {
  await navigateTo('/admin')
}

const password = ref('')
const error = ref('')
const loading = ref(false)

async function login() {
  loading.value = true
  error.value = ''
  try {
    const res = await $fetch('/api/admin/login', { method: 'POST', body: { password: password.value } })
    setToken(res.token)
    await navigateTo('/admin')
  } catch {
    error.value = 'Wrong password'
  } finally {
    loading.value = false
  }
}

useSeoMeta({ title: 'Admin login — TopAICollection' })
</script>

<template>
  <div class="mx-auto max-w-sm px-4 py-20 sm:px-6 lg:px-8">
    <h1 class="text-xl font-bold text-ink-900">Admin login</h1>
    <form class="mt-6 space-y-4" @submit.prevent="login">
      <input v-model="password" type="password" placeholder="Admin password" required
             class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400">
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <button :disabled="loading" class="w-full rounded-full bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">
        {{ loading ? 'Signing in…' : 'Sign in' }}
      </button>
    </form>
  </div>
</template>
