export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const { password } = await readBody(event)

  if (password !== config.adminPassword) {
    throw createError({ statusCode: 401, statusMessage: 'Wrong password' })
  }

  // Starter-grade: everyone with the shared password gets the same
  // shared token. Fine for a single-admin demo; replace with real
  // per-user sessions before this becomes a multi-admin product.
  return { token: config.adminToken }
})
