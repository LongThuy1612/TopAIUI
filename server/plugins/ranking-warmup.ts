// Build the in-memory datasets as soon as the server starts — the ranking
// (server/utils/ranking.ts), Website Insights and Social Listening — so the first
// visitor after a deploy or restart doesn't wait for tens of thousands of rows to load.
// Not awaited: startup isn't held up, and a failure just leaves the build to the first
// request. One after the other, so they don't all compete for the database at once.
export default defineNitroPlugin(() => {
  if (import.meta.dev || import.meta.prerender) return
  ;(async () => {
    for (const [label, build] of [
      ['ranking', getRankingDataset],
      ['insights', loadInsightRows],
      ['social listening', loadSocialRows]
    ] as const) {
      await build().catch(err => console.error(`[${label}] warm-up failed`, err))
    }
  })()
})
