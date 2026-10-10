// Deletes uploaded images that nothing points at any more — picked then removed in a
// form, or uploaded and never saved. Files younger than GRACE_MS are kept: they may
// belong to a form someone is still filling in. Scheduled nightly in nuxt.config.ts
// (nitro.scheduledTasks); in dev it can be run by hand via /_nitro/tasks/uploads:cleanup.
const GRACE_MS = 24 * 60 * 60 * 1000
// Article / guest post images: a long text can take days to write before it is saved.
const ARTICLE_GRACE_MS = 7 * GRACE_MS
const UPLOAD_URL = /\/uploads\/([a-z0-9_/-]+\.(?:png|jpg|webp|gif))/g

export default defineTask({
  meta: { name: 'uploads:cleanup', description: 'Delete uploaded images nothing references' },
  async run() {
    // Every place that can reference an upload: a tool's logo, icon, cover and gallery; a
    // paid tool update still waiting for review (its new images live in `changes`); an
    // article's cover and text; a guest post submission's cover and text.
    const rows = await prisma.$queryRaw<{ refs: string }[]>`
      SELECT concat_ws(' ', "logoUrl", icon, "screenshotUrl", images::text) AS refs
      FROM "Tool"
      WHERE "logoUrl" LIKE '%/uploads/%' OR icon LIKE '%/uploads/%'
         OR "screenshotUrl" LIKE '%/uploads/%' OR images::text LIKE '%/uploads/%'
      UNION ALL
      SELECT changes::text FROM "ToolUpdateRequest" WHERE changes::text LIKE '%/uploads/%'
      UNION ALL
      SELECT concat_ws(' ', "coverUrl", content) FROM "Article"
      WHERE "coverUrl" LIKE '%/uploads/%' OR content LIKE '%/uploads/%'
      UNION ALL
      SELECT concat_ws(' ', "coverUrl", content) FROM "PostSubmission"
      WHERE "coverUrl" LIKE '%/uploads/%' OR content LIKE '%/uploads/%'
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
    const articleCutoff = Date.now() - ARTICLE_GRACE_MS
    let deleted = 0
    for (const key of await storage.getKeys()) {
      const path = key.replaceAll(':', '/')
      if (used.has(path)) continue
      const { mtime } = await storage.getMeta(key)
      const keepAfter = path.startsWith('posts/') || path.startsWith('articles/') ? articleCutoff : cutoff
      if (!mtime || new Date(mtime).getTime() > keepAfter) continue
      await storage.removeItem(key)
      deleted++
    }
    return { result: { referenced: used.size, deleted, skipped: false } }
  }
})
