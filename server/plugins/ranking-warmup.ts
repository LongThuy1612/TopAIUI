// Build the in-memory ranking dataset (server/utils/ranking.ts) as soon as the
// server starts, so the first visitor to /ranking after a deploy or restart
// doesn't wait for ~40k rows of traffic JSON to load. Not awaited: startup
// isn't held up, and a failure just leaves the build to the first request.
export default defineNitroPlugin(() => {
  if (import.meta.dev || import.meta.prerender) return
  getRankingDataset().catch(err => console.error('[ranking] warm-up failed', err))
})
