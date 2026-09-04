export function useAdminAuth() {
  const token = useState<string | null>('admin-token', () => null)

  function load() {
    if (import.meta.client && !token.value) {
      token.value = localStorage.getItem('admin-token')
    }
  }

  function setToken(t: string) {
    token.value = t
    if (import.meta.client) localStorage.setItem('admin-token', t)
  }

  function logout() {
    token.value = null
    if (import.meta.client) localStorage.removeItem('admin-token')
  }

  function authHeaders(): Record<string, string> {
    return token.value ? { 'x-admin-token': token.value } : {}
  }

  return { token, load, setToken, logout, authHeaders }
}
