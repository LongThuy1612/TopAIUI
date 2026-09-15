const STORAGE_KEY = 'topainew:mock-user'

export function useMockAuth() {
  const userName = useState<string | null>('mock-user-name', () => null)

  function load() {
    if (import.meta.client && userName.value === null) {
      userName.value = localStorage.getItem(STORAGE_KEY)
    }
  }

  function login(name: string) {
    userName.value = name
    if (import.meta.client) localStorage.setItem(STORAGE_KEY, name)
  }

  function logout() {
    userName.value = null
    if (import.meta.client) localStorage.removeItem(STORAGE_KEY)
  }

  return { userName, load, login, logout }
}
