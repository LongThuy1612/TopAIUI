<script setup lang="ts">
const categories = await $fetch('/api/categories')

const form = reactive({
  name: '', categorySlug: '', website: '', pricingType: 'FREEMIUM'
})
const submitting = ref(false)
const result = ref<'idle' | 'success' | 'error'>('idle')
const errorMessage = ref('')

async function onSubmit() {
  submitting.value = true
  result.value = 'idle'
  try {
    await $fetch('/api/submit', { method: 'POST', body: form })
    result.value = 'success'
  } catch (e: any) {
    result.value = 'error'
    errorMessage.value = e?.data?.statusMessage || 'Something went wrong'
  } finally {
    submitting.value = false
  }
}

useSeoMeta({ title: 'Submit a tool — TopAICollection' })
</script>

<template>
  <div class="mx-auto max-w-xl px-4 py-14 sm:px-6 lg:px-8">
    <h1 class="text-2xl font-extrabold text-ink-900">Submit a tool</h1>
    <p class="mt-2 text-sm text-ink-600">Your submission goes into a moderation queue and appears on the site once an admin approves it.</p>

    <div v-if="result === 'success'" class="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
      Thanks! Your tool was submitted and is pending review.
    </div>

    <form v-else class="mt-6 space-y-4" @submit.prevent="onSubmit">
      <div>
        <label class="text-xs font-semibold text-ink-600">Tool name</label>
        <input v-model="form.name" required class="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400">
      </div>
      <div>
        <label class="text-xs font-semibold text-ink-600">Category</label>
        <select v-model="form.categorySlug" required class="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400">
          <option value="" disabled>Select a category</option>
          <option v-for="c in categories" :key="c.slug" :value="c.slug">{{ c.name }}</option>
        </select>
      </div>
      <div>
        <label class="text-xs font-semibold text-ink-600">Website URL</label>
        <input v-model="form.website" type="url" class="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400">
      </div>
      <div>
        <label class="text-xs font-semibold text-ink-600">Pricing</label>
        <select v-model="form.pricingType" class="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400">
          <option value="FREE">Free</option>
          <option value="FREEMIUM">Freemium</option>
          <option value="PAID">Paid</option>
        </select>
      </div>

      <p v-if="result === 'error'" class="text-sm text-red-600">{{ errorMessage }}</p>

      <button :disabled="submitting" class="w-full rounded-full bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">
        {{ submitting ? 'Submitting…' : 'Submit for review' }}
      </button>
    </form>
  </div>
</template>
