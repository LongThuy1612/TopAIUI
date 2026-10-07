// URLs that end up in an <a href> or window.open() on the client. Website
// columns are filled by admins and by crawler imports without validation, so
// anything that isn't plain http(s) (javascript:, data:, …) is dropped here
// rather than handed to the browser.
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value.trim())
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}
