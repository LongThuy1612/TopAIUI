// The weekly newsletter (server/utils/newsletter.ts): creates Friday's issue, then sends
// it a few dozen addresses an hour within the daily limit. Scheduled hourly in
// nuxt.config.ts; in dev run it by hand via /_nitro/tasks/newsletter:send.
export default defineTask({
  meta: { name: 'newsletter:send', description: 'Send the weekly newsletter (next batch)' },
  async run() {
    return { result: await runNewsletter() }
  }
})
