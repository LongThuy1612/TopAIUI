// Nuxt's renderer adds "X-Powered-By: Nuxt" to every page — it only tells attackers
// what to look for.
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:response', (response) => {
    for (const key of Object.keys(response.headers ?? {})) {
      if (key.toLowerCase() === 'x-powered-by') delete response.headers![key]
    }
  })
})
