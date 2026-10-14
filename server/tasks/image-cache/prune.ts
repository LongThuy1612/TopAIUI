// Deletes resized images (server/routes/img.get.ts) made more than MAX_AGE_MS ago.
// The cache only grows otherwise — and anyone can ask /img for any image on an
// allowed host. A deleted one is simply made again the next time it's asked for
// (browsers keep their copy for 30 days anyway). Scheduled nightly in nuxt.config.ts
// (nitro.scheduledTasks); in dev it can be run by hand via /_nitro/tasks/image-cache:prune.
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

export default defineTask({
  meta: { name: 'image-cache:prune', description: 'Delete resized images older than 30 days' },
  async run() {
    const storage = useStorage('image-cache')
    const keepAfter = Date.now() - MAX_AGE_MS
    let deleted = 0
    for (const key of await storage.getKeys()) {
      const { mtime } = await storage.getMeta(key)
      if (!mtime || new Date(mtime).getTime() > keepAfter) continue
      await storage.removeItem(key)
      deleted++
    }
    return { result: { deleted } }
  }
})
