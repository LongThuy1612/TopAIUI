// Dashboard pages: any logged-in user. The session token lives in browser
// storage, so this only runs client-side (dashboard routes are ssr: false).
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return

  const user = await useAuth().ensureUser()
  if (!user) {
    return navigateTo(useLocalePath()({ path: '/login', query: { redirect: to.fullPath } }))
  }
})
