export function useAdminAuth() {
  const token = useState<string | null>('admin-token', () => null)
  // True only when authorized via the real shared admin password, as
  // opposed to the temporary user-session fallback below.
  const isSharedLogin = useState('admin-token-is-shared', () => false)

  function load() {
    if (!import.meta.client) return
    if (!token.value) {
      const stored = localStorage.getItem('admin-token')
      if (stored) {
        token.value = stored
        isSharedLogin.value = true
      }
    }
    if (!token.value) {
      // TEMPORARY: fall back to any logged-in user's session so the
      // /admin gate lets them through too. Requested as a stopgap
      // until real role-based access control is built.
      const { token: userToken, load: loadUserAuth } = useAuth()
      loadUserAuth()
      if (userToken.value) {
        token.value = userToken.value
        isSharedLogin.value = false
      }
    }
  }

  function setToken(t: string) {
    token.value = t
    isSharedLogin.value = true
    if (import.meta.client) localStorage.setItem('admin-token', t)
  }

  function logout() {
    token.value = null
    isSharedLogin.value = false
    if (import.meta.client) {
      localStorage.removeItem('admin-token')
      // The gate can also be satisfied by a real user session (see
      // `load()` above), so clear that too — otherwise the next
      // `load()` just re-authenticates via the still-active session
      // and admin logout silently does nothing.
      useAuth().logout()
    }
  }

  function authHeaders(): Record<string, string> {
    return token.value ? { 'x-admin-token': token.value } : {}
  }

  return { token, isSharedLogin, load, setToken, logout, authHeaders }
}
