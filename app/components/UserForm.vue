<script setup lang="ts">
import type { AdminUser, UserRole } from '~/types'

// Create / edit a user from User Management (admin only). In edit mode an
// empty password keeps the current one. The server enforces the same rules
// (no self-demote/ban, keep at least one admin) — the UI just explains them.
const props = defineProps<{ mode: 'create' | 'edit'; user?: AdminUser | null }>()
const emit = defineEmits<{ saved: [user: AdminUser]; cancel: [] }>()

const { t } = useI18n()
const { user: me, authHeaders } = useAuth()

const roles: UserRole[] = ['USER', 'MANAGER', 'ADMIN']
const isSelf = computed(() => props.mode === 'edit' && props.user?.id === me.value?.id)

const form = reactive({
  email: props.user?.email ?? '',
  name: props.user?.name ?? '',
  role: (props.user?.role ?? 'USER') as UserRole,
  password: '',
  isBanned: props.user?.isBanned ?? false
})

const saving = ref(false)
const errorMessage = ref('')

async function submit() {
  saving.value = true
  errorMessage.value = ''
  try {
    const body: Record<string, unknown> = { email: form.email, name: form.name, role: form.role }
    if (form.password) body.password = form.password
    const saved = props.mode === 'create'
      ? await $fetch<AdminUser>('/api/admin/users', { method: 'POST', headers: authHeaders(), body: { ...body, password: form.password } })
      : await $fetch<AdminUser>(`/api/admin/users/${props.user!.id}`, { method: 'PATCH', headers: authHeaders(), body: { ...body, isBanned: form.isBanned } })
    form.password = ''
    emit('saved', saved)
  } catch (e: any) {
    errorMessage.value = e?.data?.message || t('admin.saveError')
  } finally {
    saving.value = false
  }
}

const inputClass = 'w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400 disabled:border-ink-100 disabled:bg-ink-100/40 disabled:text-ink-400'
</script>

<template>
  <form class="max-w-xl space-y-4" @submit.prevent="submit">
    <label class="block">
      <span class="mb-1 block text-xs font-semibold text-ink-600">{{ t('admin.users.fieldEmail') }}</span>
      <input v-model="form.email" type="email" required autocomplete="off" :class="inputClass">
    </label>

    <label class="block">
      <span class="mb-1 block text-xs font-semibold text-ink-600">{{ t('admin.users.fieldName') }}</span>
      <input v-model="form.name" type="text" autocomplete="off" :class="inputClass">
    </label>

    <label class="block">
      <span class="mb-1 block text-xs font-semibold text-ink-600">{{ t('admin.users.fieldRole') }}</span>
      <select v-model="form.role" :disabled="isSelf" :class="inputClass">
        <option v-for="r in roles" :key="r" :value="r">{{ t(`admin.users.roles.${r}`) }}</option>
      </select>
    </label>

    <label class="block">
      <span class="mb-1 block text-xs font-semibold text-ink-600">
        {{ mode === 'create' ? t('admin.users.fieldPassword') : t('admin.users.fieldNewPassword') }}
      </span>
      <input v-model="form.password" type="password" :required="mode === 'create'" minlength="6" autocomplete="new-password" :class="inputClass">
      <span v-if="mode === 'edit'" class="mt-1 block text-xs text-ink-400">{{ t('admin.users.passwordHint') }}</span>
    </label>

    <label v-if="mode === 'edit'" class="flex items-center gap-2 text-sm text-ink-700">
      <input v-model="form.isBanned" type="checkbox" :disabled="isSelf" class="h-4 w-4 rounded border-ink-300">
      {{ t('admin.users.fieldBanned') }}
    </label>

    <p v-if="isSelf" class="text-xs text-amber-600">{{ t('admin.users.selfHint') }}</p>
    <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>

    <div class="flex gap-3 pt-2">
      <button type="submit" :disabled="saving" class="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">
        {{ saving ? t('admin.saving') : mode === 'create' ? t('admin.users.create') : t('admin.save') }}
      </button>
      <button type="button" class="rounded-lg border border-ink-200 px-5 py-2.5 text-sm font-semibold text-ink-700 hover:border-brand-300" @click="emit('cancel')">
        {{ t('admin.cancel') }}
      </button>
    </div>
  </form>
</template>
