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

// Same, for imported profile links (website, X, Discord), which often lack the
// scheme ("discord.gg/…") and would otherwise become a relative link on our site.
// Display only — input validation keeps using safeHttpUrl.
export function safeLinkUrl(value: string | null | undefined): string | null {
  const s = value?.trim()
  if (!s) return null
  return safeHttpUrl(/^[a-z][a-z\d+.-]*:/i.test(s) ? s : `https://${s}`)
}
