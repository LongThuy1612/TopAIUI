<script setup lang="ts">
const { t } = useI18n()
const { toasts, dismiss } = useToast()

const tone: Record<string, string> = {
  info: 'border-ink-200 bg-white text-ink-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  error: 'border-red-200 bg-red-50 text-red-800'
}
</script>

<template>
  <Teleport to="body">
    <div class="pointer-events-none fixed inset-x-0 top-20 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite" role="status">
      <TransitionGroup
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="-translate-y-2 opacity-0"
        leave-active-class="transition duration-150 ease-in"
        leave-to-class="opacity-0"
      >
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="['pointer-events-auto flex max-w-md items-start gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg', tone[toast.type]]"
        >
          <span class="min-w-0 flex-1">{{ toast.message }}</span>
          <button type="button" class="shrink-0 opacity-60 hover:opacity-100" :aria-label="t('admin.upgradeModal.close')" @click="dismiss(toast.id)">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
