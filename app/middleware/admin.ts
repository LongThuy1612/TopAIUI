// Admin-only pages (Tool Management). Use together with `auth`:
// definePageMeta({ middleware: ['auth', 'admin'] }).
// This only hides the UI — the /api/admin/** endpoints check the role again.
export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) return

  const user = await useAuth().ensureUser()
  if (user?.role !== 'ADMIN') {
    return navigateTo('/dashboard')
  }
})
