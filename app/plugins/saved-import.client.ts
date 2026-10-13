// Before saves needed an account, the star kept favorites in localStorage. Once the
// visitor is logged in, move them into the account (POST /api/me/saved/import) and
// drop the local list; on failure it stays and is retried on the next login.
const LEGACY_KEY = 'topainew:favorites'

export default defineNuxtPlugin((nuxtApp) => {
  const { token, authHeaders, load } = useAuth()
  const importVersion = useState('saved-import-version', () => 0)
  // Restore a stored session on any page, not only those that check login themselves.
  nuxtApp.hook('app:mounted', () => load())

  function readLegacy(): string[] {
    try {
      const list = JSON.parse(localStorage.getItem(LEGACY_KEY) ?? '[]')
      return Array.isArray(list) ? list.filter((s): s is string => typeof s === 'string') : []
    } catch {
      return []
    }
  }

  watch(token, async (value) => {
    if (!value) return
    const slugs = readLegacy()
    try {
      if (slugs.length) {
        await $fetch('/api/me/saved/import', { method: 'POST', headers: authHeaders(), body: { slugs } })
        // An open tool page re-reads its star (app/pages/tools/[slug].vue).
        importVersion.value++
      }
      localStorage.removeItem(LEGACY_KEY)
    } catch {
      // keep the list for the next login
    }
  }, { immediate: true })
})
