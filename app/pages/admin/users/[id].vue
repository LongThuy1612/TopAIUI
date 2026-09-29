<script setup lang="ts">
import type { AdminUser } from '~/types'

const { t } = useI18n()
definePageMeta({ layout: 'dashboard', middleware: ['auth', 'admin'] })
const route = useRoute()
const router = useRouter()
const { authHeaders } = useAuth()

const { data: user } = await useFetch<AdminUser>(`/api/admin/users/${route.params.id}`, {
  headers: authHeaders(),
  watch: false
})

const savedNotice = ref(false)
function onSaved(u: AdminUser) {
  user.value = u
  savedNotice.value = true
}

const goBack = () => router.push('/admin/users')

useSeoMeta({ title: () => `${t('admin.users.editTitle')} — TopAICollection` })
</script>

<template>
  <div>
    <button type="button" class="flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-brand-600" @click="goBack">
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      {{ t('admin.backToList') }}
    </button>

    <div v-if="!user" class="mt-10 text-sm text-ink-400">{{ t('admin.users.loadError') }}</div>

    <template v-else>
      <h1 class="mt-3 text-xl font-extrabold text-ink-900">{{ t('admin.users.editTitle') }}</h1>
      <p class="mt-1 text-sm text-ink-500">{{ user.email }}</p>
      <p v-if="savedNotice" class="mt-3 text-sm text-emerald-600">{{ t('admin.users.saved') }}</p>

      <UserForm :key="user.updatedAt" class="mt-6" mode="edit" :user="user" @saved="onSaved" @cancel="goBack" />
    </template>
  </div>
</template>
