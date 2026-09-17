import type { H3Event } from 'h3'

// Minimal starter auth: a single shared admin token compared against
// the `x-admin-token` header. This is enough to demonstrate the ISR/
// caching split between public and admin routes, but it is NOT a real
// auth system — swap in a proper solution (Supabase Auth, Lucia,
// @sidebase/nuxt-auth, etc.) with per-user accounts before going live.
//
// TEMPORARY: also accepts any valid logged-in user's token (no role
// check at all). This intentionally lets any registered account into
// the admin panel — requested as a stopgap until real role-based
// access control is built. Do not leave this in place for production.
export function requireAdmin(event: H3Event) {
  const config = useRuntimeConfig()
  const token = getHeader(event, 'x-admin-token')

  if (token && (token === config.adminToken || verifyUserToken(token))) {
    return
  }

  throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
}
