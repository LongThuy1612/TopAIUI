import { lookup } from 'node:dns/promises'
import http, { type IncomingMessage } from 'node:http'
import https from 'node:https'
import { BlockList, isIP, type LookupFunction } from 'node:net'

// "Paste a link" for AI News link items: reads a public page's title / description /
// og:image so the admin doesn't retype them. The URL comes from a person, so every hop is
// checked (SSRF): http(s) only, default ports, the socket only connects to public addresses,
// redirects are followed by hand (max 4), with a timeout and a size cap.

const PRIVATE = new BlockList()
for (const [net, bits] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
  ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15],
  ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4]
] as const) PRIVATE.addSubnet(net, bits, 'ipv4')
for (const [net, bits] of [
  ['::', 128], ['::1', 128], ['64:ff9b::', 96], ['100::', 64], ['2001:db8::', 32],
  ['fc00::', 7], ['fe80::', 10], ['ff00::', 8]
] as const) PRIVATE.addSubnet(net, bits, 'ipv6')

// (No ::ffff:0:0/96 rule: BlockList also matches IPv4 against it — mapped addresses are
// unwrapped below instead.)
const isPrivate = (ip: string) => {
  const v = isIP(ip)
  if (v === 6 && /^::ffff:/i.test(ip)) return PRIVATE.check(ip.slice(7), 'ipv4') || PRIVATE.check(ip, 'ipv6')
  return v === 4 ? PRIVATE.check(ip, 'ipv4') : v === 6 ? PRIVATE.check(ip, 'ipv6') : true
}

const HEADERS = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
  'accept-language': 'en-US,en;q=0.9'
}

// A public http(s) URL on a default port, or null.
export function publicHttpUrl(value: string) {
  let u: URL
  try { u = new URL(value) } catch { return null }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
  if (u.username || u.password || u.port) return null
  return u
}

// dns.lookup that refuses private addresses. The socket itself uses it, so a host can't
// pass a check and then resolve somewhere else on connect (DNS rebinding).
const publicLookup = ((hostname: string, options: { all?: boolean }, callback: (...args: any[]) => void) => {
  lookup(hostname, { all: true, verbatim: true }).then((list) => {
    if (!list.length || list.some(a => isPrivate(a.address))) return callback(Object.assign(new Error('private address'), { code: 'EPRIVATE' }))
    if (options?.all) callback(null, list)
    else callback(null, list[0]!.address, list[0]!.family)
  }, err => callback(err))
}) as unknown as LookupFunction

function get(u: URL, accept: string, signal: AbortSignal) {
  return new Promise<IncomingMessage>((resolve, reject) => {
    // An IP in the URL skips the lookup — check it here.
    const host = u.hostname.replace(/^\[|\]$/g, '')
    if (isIP(host) && isPrivate(host)) return reject(new Error('private address'))
    const req = (u.protocol === 'https:' ? https : http).get(u, { headers: { ...HEADERS, accept }, lookup: publicLookup, signal }, resolve)
    req.on('error', reject)
  })
}

// GET with every redirect hop checked; returns the final response and URL.
async function safeFetch(url: string, accept: string, timeoutMs = 10_000) {
  const signal = AbortSignal.timeout(timeoutMs) // covers the redirects and reading the body
  let current = publicHttpUrl(url)
  for (let hop = 0; current && hop <= 4; hop++) {
    const res = await get(current, accept, signal)
    const location = res.headers.location
    if (res.statusCode! >= 300 && res.statusCode! < 400 && location) {
      res.resume()
      current = publicHttpUrl(new URL(location, current).href)
      continue
    }
    return { res, url: current }
  }
  throw new Error('bad redirect')
}

const isOk = (res: IncomingMessage) => res.statusCode! >= 200 && res.statusCode! < 300

async function readCapped(res: IncomingMessage, max: number) {
  if (Number(res.headers['content-length']) > max) { res.destroy(); throw new Error('too large') }
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of res as AsyncIterable<Buffer>) {
    size += chunk.length
    if (size > max) { res.destroy(); throw new Error('too large') }
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

// The page's own charset (header, else <meta charset>), UTF-8 by default.
function decodeHtml(data: Buffer, contentType: string) {
  const head = data.subarray(0, 4096).toString('latin1')
  const charset = contentType.match(/charset=["']?([\w-]+)/i)?.[1] ?? head.match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1] ?? 'utf-8'
  try { return new TextDecoder(charset).decode(data) } catch { return data.toString('utf8') }
}

const decode = (s: string) => s
  .replace(/&quot;/g, '"').replace(/&#x27;|&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&nbsp;/g, ' ')
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ')
  .trim()

function metaOf(html: string, ...names: string[]) {
  for (const name of names) {
    for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
      const key = tag.match(/(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1]
      if (key?.toLowerCase() !== name) continue
      const content = tag.match(/content\s*=\s*"([^"]*)"/i)?.[1] ?? tag.match(/content\s*=\s*'([^']*)'/i)?.[1]
      if (content && decode(content)) return decode(content)
    }
  }
  return ''
}

// Title, summary and the page's image saved to our uploads (null when it can't be had).
export async function readLinkPreview(url: string) {
  let page: { res: IncomingMessage; url: URL }
  try {
    page = await safeFetch(url, 'text/html,application/xhtml+xml')
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'That page could not be opened.' })
  }
  const contentType = page.res.headers['content-type'] ?? ''
  if (!isOk(page.res) || !/html/i.test(contentType)) {
    page.res.destroy()
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'That page could not be read.' })
  }
  let html: string
  try {
    html = decodeHtml(await readCapped(page.res, 3 * 1024 * 1024), contentType)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'That page could not be read.' })
  }
  const title = (metaOf(html, 'og:title', 'twitter:title') || decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '')).slice(0, 200)
  const excerpt = metaOf(html, 'og:description', 'twitter:description', 'description').slice(0, 300)
  const image = metaOf(html, 'og:image', 'og:image:url', 'twitter:image')
  let coverUrl: string | null = null
  if (image) {
    try {
      const img = await safeFetch(new URL(image, page.url).href, 'image/*')
      if (isOk(img.res)) {
        const data = await readCapped(img.res, MAX_UPLOAD_BYTES)
        const kind = detectImage(data)
        if (kind) coverUrl = await saveImage('articles', data, kind.ext)
      } else img.res.destroy()
    } catch {}
  }
  return { title, excerpt, coverUrl }
}
