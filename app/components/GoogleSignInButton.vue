<script lang="ts">
// Module scope (not per component instance) so moving between /login and
// /register while the script is still loading doesn't inject it twice.
const GSI_SRC = 'https://accounts.google.com/gsi/client'
let gsiPromise: Promise<void> | null = null

function loadGsi(): Promise<void> {
  if ((window as any).google?.accounts?.id) return Promise.resolve()
  gsiPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GSI_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      gsiPromise = null
      script.remove()
      reject(new Error('Failed to load Google Identity Services'))
    }
    document.head.appendChild(script)
  })
  return gsiPromise
}
</script>

<script setup lang="ts">
import type { AuthUser } from '~/composables/useAuth'

// "Sign in with Google" via Google Identity Services: Google renders the
// button, hands us an ID token, and /api/auth/google turns it into our own
// session token. Renders nothing when no client ID is configured.
const props = withDefaults(defineProps<{
  text?: 'signin_with' | 'signup_with' | 'continue_with'
  remember?: boolean
}>(), { text: 'continue_with', remember: true })

const emit = defineEmits<{
  'signed-in': []
  error: [statusCode: number | undefined]
  // Google's script couldn't load (ad blocker, offline) — the button is gone.
  unavailable: []
}>()

const { locale } = useI18n()
const { setSession } = useAuth()
const clientId = useRuntimeConfig().public.googleClientId as string

const container = ref<HTMLElement | null>(null)
const loading = ref(false)
const unavailable = ref(false)

async function onCredential(response: { credential: string }) {
  loading.value = true
  try {
    const res = await $fetch<{ token: string; user: AuthUser }>('/api/auth/google', {
      method: 'POST',
      body: { credential: response.credential }
    })
    setSession(res.token, res.user, props.remember)
    emit('signed-in')
  } catch (err: unknown) {
    emit('error', (err as { statusCode?: number })?.statusCode)
  } finally {
    loading.value = false
  }
}

async function render() {
  if (!clientId || !container.value) return
  try {
    await loadGsi()
  } catch {
    // Blocked (ad blocker, offline): hide the button rather than showing an
    // error before the user did anything.
    unavailable.value = true
    emit('unavailable')
    return
  }
  // Unmounted while the script was loading.
  if (!container.value) return
  const gsi = (window as any).google.accounts.id
  gsi.initialize({ client_id: clientId, callback: onCredential, ux_mode: 'popup' })
  container.value.innerHTML = ''
  gsi.renderButton(container.value, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    shape: 'pill',
    text: props.text,
    logo_alignment: 'center',
    locale: locale.value,
    // GIS caps the width at 400px.
    width: Math.min(400, container.value.offsetWidth || 400)
  })
}

onMounted(render)
watch(locale, render)
</script>

<template>
  <div v-if="clientId && !unavailable" class="relative flex justify-center">
    <div ref="container" class="flex w-full justify-center" :class="{ 'pointer-events-none opacity-50': loading }" />
  </div>
</template>
