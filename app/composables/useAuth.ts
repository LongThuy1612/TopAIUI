const STORAGE_KEY = 'topainew:user-token'

export interface AuthUser {
  id: string
  email: string
  name: string | null
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

  return { token, user, load, setSession, logout, fetchMe }
}
