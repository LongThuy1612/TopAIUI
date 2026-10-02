// Deletes uploaded images that no tool points at any more — picked then removed in a
// form, or uploaded and never saved. Files younger than GRACE_MS are kept: they may
// belong to a form someone is still filling in. Scheduled nightly in nuxt.config.ts
// (nitro.scheduledTasks); in dev it can be run by hand via /_nitro/tasks/uploads:cleanup.
const GRACE_MS = 24 * 60 * 60 * 1000
const UPLOAD_URL = /\/uploads\/([a-z0-9_/-]+\.(?:png|jpg|webp|gif))/g

export default defineTask({
  meta: { name: 'uploads:cleanup', description: 'Delete uploaded images no tool references' },
  async run() {
    // Every place a tool can reference an upload: logo, icon, cover, gallery.
    const rows = await prisma.$queryRaw<{ refs: string }[]>`
      SELECT concat_ws(' ', "logoUrl", icon, "screenshotUrl", images::text) AS refs
      FROM "Tool"
      WHERE "logoUrl" LIKE '%/uploads/%' OR icon LIKE '%/uploads/%'
         OR "screenshotUrl" LIKE '%/uploads/%' OR images::text LIKE '%/uploads/%'
    `
    const used = new Set<string>()
    for (const { refs } of rows) {
      for (const m of refs.matchAll(UPLOAD_URL)) used.add(m[1]!)
    }

    // Safety net: no reference at all means the query looked at the wrong / an empty
    // database (restore in progress, misconfigured DATABASE_URL…) far more likely than
    // every upload being unused — deleting on that basis would wipe every image.
    if (used.size === 0) return { result: { referenced: 0, deleted: 0, skipped: true } }

    const storage = useStorage('uploads')
    const cutoff = Date.now() - GRACE_MS
    let deleted = 0
    for (const key of await storage.getKeys()) {
      const path = key.replaceAll(':', '/')
      if (used.has(path)) continue
      const { mtime } = await storage.getMeta(key)
      if (!mtime || new Date(mtime).getTime() > cutoff) continue
      await storage.removeItem(key)
      deleted++
    }
    return { result: { referenced: used.size, deleted, skipped: false } }
  }
})
