const STORAGE_KEY = 'topainew:user-token'

export interface AuthUser {
  id: string
  email: string
  name: string | null
  role: 'USER' | 'MANAGER' | 'ADMIN'
  emailVerified: boolean
  // false for a Google-only account that never set one.
  hasPassword: boolean
}

export function useAuth() {
  const token = useState<string | null>('user-token', () => null)
  const user = useState<AuthUser | null>('user-info', () => null)
  const fetchingMe = useState('user-info-fetching', () => false)

  function readStoredToken() {
    return sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY)
  }

  function persistToken(newToken: string, remember: boolean) {
    if (remember) {
      localStorage.setItem(STORAGE_KEY, newToken)
      sessionStorage.removeItem(STORAGE_KEY)
    } else {
      sessionStorage.setItem(STORAGE_KEY, newToken)
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  function clearStoredToken() {
    localStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(STORAGE_KEY)
  }

  function load() {
    if (!import.meta.client) return
    if (!token.value) {
      token.value = readStoredToken()
    }
    // Token restored from storage, but the user object never survives a
    // reload (it's only ever kept in memory) — fetch it back from the
    // server so "am I logged in?" checks (which read `user`) work again.
    if (token.value && !user.value && !fetchingMe.value) {
      fetchMe()
    }
  }

  function setSession(newToken: string, newUser: AuthUser, remember = true) {
    token.value = newToken
    user.value = newUser
    if (import.meta.client) persistToken(newToken, remember)
  }

  // A fresh token for the same login (after a password change ends every other
  // session), kept in whichever storage "remember me" chose.
  function replaceToken(newToken: string) {
    token.value = newToken
    if (import.meta.client) persistToken(newToken, !!localStorage.getItem(STORAGE_KEY))
  }

  function logout() {
    token.value = null
    user.value = null
    if (import.meta.client) clearStoredToken()
  }

  async function fetchMe() {
    if (!token.value) return null
    fetchingMe.value = true
    try {
      const me = await $fetch<AuthUser>('/api/auth/me', { headers: { 'x-user-token': token.value } })
      user.value = me
      return me
    } catch {
      logout()
      return null
    } finally {
      fetchingMe.value = false
    }
  }

  // Restores the session and waits for /api/auth/me, so callers (route
  // middleware) can read `user.role` reliably. Client-only.
  async function ensureUser() {
    load()
    if (!token.value) return null
    return user.value ?? await fetchMe()
  }

  const isAdmin = computed(() => user.value?.role === 'ADMIN')

  function authHeaders(): Record<string, string> {
    return token.value ? { 'x-user-token': token.value } : {}
  }

  return { token, user, isAdmin, load, ensureUser, setSession, replaceToken, logout, fetchMe, authHeaders }
}
