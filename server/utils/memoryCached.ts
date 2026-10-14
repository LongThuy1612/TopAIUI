// A dataset kept in this process's memory and rebuilt in the background once it is older
// than `maxAgeMs`, the old copy served meanwhile — the ranking dataset's pattern
// (server/utils/ranking.ts). For big datasets (tens of thousands of rows): Nitro's
// defineCachedFunction keeps its values as JSON text in storage and parses them again on
// every read — ~100 ms per request for ~30k rows, and a new copy each time.
//
// Callers get the same object every time until the next rebuild: they must not change it.
// In dev it is never cached, so database edits show up right away.

// After a failed rebuild the old copy stays in use, and the next try waits this long —
// not the next request: while the database struggles, every page view would otherwise
// fire the heavy query again.
const RETRY_AFTER_FAILURE_MS = 60_000

export function memoryCached<T>(label: string, load: () => Promise<T>, maxAgeMs: number) {
  let cached: { value: T; at: number } | null = null
  let building: Promise<T> | null = null

  function rebuild() {
    building ??= load()
      .then((value) => {
        cached = { value, at: Date.now() }
        return value
      })
      .catch((err) => {
        if (cached) cached.at = Date.now() - maxAgeMs + RETRY_AFTER_FAILURE_MS
        throw err
      })
      .finally(() => { building = null })
    return building
  }

  return async (): Promise<T> => {
    if (import.meta.dev) return load()
    if (!cached) return rebuild()
    // One background rebuild at a time, logged once if it fails.
    if (!building && Date.now() - cached.at > maxAgeMs) {
      rebuild().catch(err => console.error(`[${label}] rebuild failed`, err))
    }
    return cached.value
  }
}
