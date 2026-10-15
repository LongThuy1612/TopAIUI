// Drops Hot-this-week counts older than 60 days (server/utils/toolStats.ts). Scheduled
// nightly in nuxt.config.ts; in dev run it by hand via /_nitro/tasks/tools:stats-cleanup.
export default defineTask({
  meta: { name: 'tools:stats-cleanup', description: 'Delete old tool view / visit counts' },
  async run() {
    return { result: { deleted: await cleanUpToolStats() } }
  }
})
