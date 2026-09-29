<script setup lang="ts">
import type { AdminUser } from '~/types'

const { t } = useI18n()
definePageMeta({ layout: 'dashboard', middleware: ['auth', 'admin'] })
const router = useRouter()

const goBack = () => router.push('/admin/users')
const onSaved = (u: AdminUser) => router.push(`/admin/users/${u.id}`)

useSeoMeta({ title: () => `${t('admin.users.newTitle')} — TopAICollection` })
</script>

<template>
  <div>
    <button type="button" class="flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-brand-600" @click="goBack">
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      {{ t('admin.backToList') }}
    </button>

    <h1 class="mt-3 text-xl font-extrabold text-ink-900">{{ t('admin.users.newTitle') }}</h1>

    <UserForm class="mt-6" mode="create" @saved="onSaved" @cancel="goBack" />
  </div>
</template>
