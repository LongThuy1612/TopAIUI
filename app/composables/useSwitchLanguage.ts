// Language switch. Goes straight to the page's URL in the new language (/vi/…) and
// lets i18n load that language's messages during the navigation — instead of
// setLocale(), which first re-renders and re-fetches the current page in the new
// language and only then navigates, with no loading bar in between.
//
// Switching back and forth quickly reloads every list on the page each time, so
// more than SWITCH_LIMIT switches within SWITCH_WINDOW_MS shows a toast and blocks
// switching for BLOCK_MS.
const SWITCH_LIMIT = 5
const SWITCH_WINDOW_MS = 10_000
const BLOCK_MS = 30_000
const BLOCK_KEY = 'topainew:lang-switch-blocked-until'

// Browser-only module state, deliberately not useState(): a navigation to a cached
// page loads its _payload.json, whose server-rendered state would reset these on
// every switch. Only ever changed in the browser, so the server copy stays empty.
const pending = ref<string | null>(null) // the language being switched to, so the picker shows it at once
let recent: number[] = []
let blockedUntil = 0

export function useSwitchLanguage() {
  const { t, locale, setLocaleCookie } = useI18n()
  const switchLocalePath = useSwitchLocalePath()
  const localePath = useLocalePath()
  const { show } = useToast()

  // Survives a reload within the tab, so refreshing doesn't lift the block.
  function readStoredBlock() {
    try { return Number(sessionStorage.getItem(BLOCK_KEY)) || 0 } catch { return 0 }
  }
  function storeBlock(until: number) {
    try { sessionStorage.setItem(BLOCK_KEY, String(until)) } catch {}
  }

  // This page in another language. A page with no localized URL (e.g. a 404)
  // goes to that language's home page.
  function pathFor(code: string) {
    const lang = code as typeof locale.value
    return switchLocalePath(lang) || localePath('/', lang)
  }

  function tooFast() {
    show(t('languageSwitch.tooFast'), { type: 'warning' })
  }

  // false when nothing happens (same language, blocked, a switch already running).
  async function switchLanguage(code: string): Promise<boolean> {
    if (code === locale.value) return false

    // Every pick counts, also those made while the previous switch is still
    // loading — rapid clicking is exactly what the limit is for.
    const now = Date.now()
    if (now < Math.max(blockedUntil, readStoredBlock())) {
      tooFast()
      return false
    }
    recent = [...recent.filter(at => now - at < SWITCH_WINDOW_MS), now]
    if (recent.length > SWITCH_LIMIT) {
      blockedUntil = now + BLOCK_MS
      storeBlock(blockedUntil)
      recent = []
      tooFast()
      return false
    }
    if (pending.value) return false

    pending.value = code
    try {
      // Not setLocale(): it re-renders the current page in the new language before
      // navigating, and on a page without a localized URL never navigates at all.
      const failure = await navigateTo(pathFor(code))
      if (failure) return false // cancelled or redirected by a route guard
      // Remembered for the site root ("/" sends visitors to their language) —
      // only once the page really is in that language.
      setLocaleCookie(code)
      return true
    } catch (error) {
      console.error('[language switch]', error)
      return false
    } finally {
      pending.value = null
    }
  }

  return { switchLanguage, pathFor, pending }
}
