// Drops Popular-searches counts older than 60 days (server/utils/searchTerms.ts). Scheduled
// nightly in nuxt.config.ts; in dev run it by hand via /_nitro/tasks/search:cleanup.
export default defineTask({
  meta: { name: 'search:cleanup', description: 'Delete old Popular searches counts' },
  async run() {
    return { result: { deleted: await cleanUpSearchTerms() } }
  }
})
