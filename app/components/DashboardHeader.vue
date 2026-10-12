<script setup lang="ts">
const { t } = useI18n()
const { user, isAdmin } = useAuth()
const accountInitial = computed(() => (user.value?.name || user.value?.email || 'U').slice(0, 1).toUpperCase())
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-ink-200 bg-white">
    <div class="mx-auto flex h-[64px] max-w-[1440px] items-center gap-4 px-4 sm:px-6 lg:px-8">
      <NuxtLink to="/" class="flex shrink-0 items-center gap-2.5">
        <IconLogo class="h-[28px] w-[28px] rounded-[8px]" width="28" height="28" />
        <span class="text-[18px] font-extrabold tracking-[-0.02em] text-ink-900">TopAI<span class="text-brand-500">Collection</span></span>
        <span v-if="isAdmin" class="ml-1 rounded-md bg-ink-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-ink-500">{{ t('admin.badge') }}</span>
      </NuxtLink>

      <nav class="ml-auto flex shrink-0 items-center gap-3">
        <LanguageSwitcher class="hidden sm:block" />
        <!-- The sidebar (with its account card) is hidden below lg: account menu here instead. -->
        <AccountMenu
          v-if="user"
          placement="below"
          button-class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white ring-brand-200 hover:ring-4 data-[open]:ring-4 lg:hidden"
        >
          {{ accountInitial }}
        </AccountMenu>
      </nav>
    </div>
  </header>
</template>
