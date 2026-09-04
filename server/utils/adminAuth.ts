import type { H3Event } from 'h3'

// Minimal starter auth: a single shared admin token compared against
// the `x-admin-token` header. This is enough to demonstrate the ISR/
// caching split between public and admin routes, but it is NOT a real
// auth system — swap in a proper solution (Supabase Auth, Lucia,
// @sidebase/nuxt-auth, etc.) with per-user accounts before going live.
export function requireAdmin(event: H3Event) {
  const config = useRuntimeConfig()
  const token = getHeader(event, 'x-admin-token')

  if (!token || token !== config.adminToken) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
}
