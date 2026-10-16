<script setup lang="ts">
// Account menu for the dashboard: change password, log out. Used by the sidebar's
// account card (desktop, ⋮) and the header avatar (mobile, where the sidebar is hidden).
// Teleported and fixed-positioned from the trigger: the sidebar scrolls
// (overflow-y-auto), so a menu inside it would be clipped.
const props = withDefaults(defineProps<{
  // side: right of the trigger, growing upward (card at the bottom of the sidebar).
  // below: under the trigger, right-aligned (header), with the account shown on top.
  placement?: 'side' | 'below'
  buttonClass?: string
}>(), { placement: 'side', buttonClass: '' })

const { t } = useI18n()
const { user, isAdmin, logout } = useAuth()
const route = useRoute()
const localePath = useLocalePath()
// The dialog lives in the dashboard layout, shared by both menus.
const changePasswordOpen = useState('change-password-open', () => false)

const open = ref(false)
const button = ref<HTMLElement | null>(null)
const menu = ref<HTMLElement | null>(null)
const style = ref<Record<string, string>>({})

function toggle() {
  if (open.value) {
    open.value = false
    return
  }
  const rect = button.value?.getBoundingClientRect()
  if (!rect) return
  style.value = props.placement === 'side'
    ? { left: `${rect.right + 8}px`, bottom: `${window.innerHeight - rect.bottom}px` }
    : { right: `${Math.max(8, window.innerWidth - rect.right)}px`, top: `${rect.bottom + 8}px` }
  open.value = true
}

function close() {
  open.value = false
}

function openChangePassword() {
  open.value = false
  changePasswordOpen.value = true
}

function confirmLogout() {
  open.value = false
  if (!confirm(t('admin.logoutConfirm'))) return
  logout()
  navigateTo(localePath('/login'))
}

function onPointerDown(e: PointerEvent) {
  const target = e.target as Node
  if (menu.value?.contains(target) || button.value?.contains(target)) return
  open.value = false
}
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') open.value = false
}
// The position is fixed to where the trigger was; close rather than float off it.
onMounted(() => {
  document.addEventListener('pointerdown', onPointerDown)
  document.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', close)
  window.addEventListener('scroll', close, true)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDown)
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', close)
  window.removeEventListener('scroll', close, true)
})
watch(() => route.fullPath, close)
</script>

<template>
  <button
    ref="button"
    type="button"
    :title="t('account.menu')"
    :aria-label="t('account.menu')"
    aria-haspopup="menu"
    :aria-expanded="open"
    :class="buttonClass"
    :data-open="open || undefined"
    @click="toggle"
  >
    <slot />
  </button>

  <Teleport to="body">
    <div
      v-if="open"
      ref="menu"
      role="menu"
      class="fixed z-50 w-max min-w-[180px] max-w-[calc(100vw-16px)] rounded-lg border border-ink-100 bg-white p-1 shadow-lg"
      :style="style"
    >
      <div v-if="placement === 'below' && user" class="mb-1 border-b border-ink-100 px-3 pb-2 pt-1.5">
        <span class="block truncate text-sm font-bold text-ink-900">{{ user.name || user.email }}</span>
        <span class="block truncate text-xs text-ink-400">{{ user.email }}</span>
      </div>
      <!-- The way to Saved AIs on phones, where the dashboard sidebar is hidden (customers only).
           Not in the sidebar's own menu: the sidebar already lists it. -->
      <NuxtLinkLocale v-if="!isAdmin && placement === 'below'" to="/dashboard/saved" role="menuitem" class="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-medium text-ink-800 hover:bg-ink-100/60" @click="close">
        <svg class="h-4 w-4 shrink-0 text-ink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 4h12v17l-6-4-6 4V4Z" />
        </svg>
        {{ t('savedPage.title') }}
      </NuxtLinkLocale>
      <button type="button" role="menuitem" class="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-medium text-ink-800 hover:bg-ink-100/60" @click="openChangePassword">
        <svg class="h-4 w-4 shrink-0 text-ink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M7 11V7a5 5 0 0 1 10 0v4M5 11h14v10H5V11Zm7 4v2" />
        </svg>
        {{ user?.hasPassword === false ? t('account.setPasswordTitle') : t('account.changePasswordTitle') }}
      </button>
      <button type="button" role="menuitem" class="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-medium text-ink-800 hover:bg-ink-100/60" @click="confirmLogout">
        <svg class="h-4 w-4 shrink-0 text-ink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0-4-4m4 4H7m4 8H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6" />
        </svg>
        {{ t('admin.logout') }}
      </button>
    </div>
  </Teleport>
</template>
