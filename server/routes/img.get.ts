import { createHash } from 'node:crypto'
import type { H3Event } from 'h3'
import sharp from 'sharp'
import { IMAGE_PROXY_WIDTHS, isProxiableImage } from '#shared/images'

// GET /img?u=<image URL>&w=<width>[&c=1]: a tool image resized to one of IMAGE_PROXY_WIDTHS
// and re-encoded as WebP — for hosts that serve large originals and can't resize
// themselves (shared/images.ts), and for our own uploads. URLs come from
// app/utils/image.ts (sizedImage).
//
// Only allowed hosts are fetched, redirects included, so this is not an open proxy.
// Results are kept on disk (storage "image-cache") and in browsers for 30 days: the
// URL changes whenever a tool's image does. A source that can't be fetched or read
// answers 404, and the browser falls back to the original URL, then to the tool's
// initials (app/plugins/image-fallback.client.ts).

const MAX_SOURCE_BYTES = 10 * 1024 * 1024
// For the whole download, redirects included: every /img request holds one of the
// browser's few connections to our site (HTTP/1.1), shared with pages and API calls —
// a slow source must not stall them.
const FETCH_TIMEOUT_MS = 5_000
const MAX_REDIRECTS = 3
const FAILURE_TTL_MS = 10 * 60 * 1000 // don't ask a broken source again for 10 min
// sharp, file reads and DNS lookups share libuv's small thread pool (4 threads):
// a burst of uncached images must not starve the rest of the server.
const MAX_RENDERS = 3
// Beyond this many waiting, answer 404 at once: the page then loads the original.
const MAX_QUEUED = 30
// A host that times out or fails to connect this many times in a row is skipped for
// HOST_PAUSE_MS — while it's down every image would otherwise wait the full timeout.
const HOST_FAILURES = 3
const HOST_PAUSE_MS = 60_000

const inFlight = new Map<string, Promise<Buffer | null>>()
const failedAt = new Map<string, number>()
const hostFailures = new Map<string, { count: number; pausedUntil: number }>()

// Not now (queue full, source host paused) — unlike a broken image, nothing to remember.
class Busy extends Error {}

async function fetchSource(url: string): Promise<Buffer | null> {
  const host = new URL(url).hostname
  const health = hostFailures.get(host)
  if (health && Date.now() < health.pausedUntil) throw new Busy()
  try {
    const data = await download(url)
    hostFailures.delete(host) // answered (even with a 404): the host is up
    return data
  } catch {
    // network error or timeout
    const count = (health?.count ?? 0) + 1
    hostFailures.set(host, { count, pausedUntil: count >= HOST_FAILURES ? Date.now() + HOST_PAUSE_MS : 0 })
    return null
  }
}

async function download(url: string): Promise<Buffer | null> {
  const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS)
  let current = url
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetch(current, {
      redirect: 'manual',
      signal,
      // Only formats detectImage() reads — no AVIF, which a CDN converting on the fly
      // would otherwise be free to send.
      headers: { 'User-Agent': 'TopAICollection-ImageResizer/1.0', 'Accept': 'image/webp,image/png,image/jpeg,image/gif;q=0.9,*/*;q=0.5' }
    })
    // A body left unread keeps its connection busy until garbage collection: every
    // early return below cancels it.
    const drop = () => { res.body?.cancel().catch(() => {}); return null }
    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get('location')
      drop()
      if (!next) return null
      current = new URL(next, current).toString()
      if (!isProxiableImage(current)) return null // a redirect may only stay on allowed hosts
      continue
    }
    if (!res.ok || !res.body) return drop()
    if (Number(res.headers.get('content-length')) > MAX_SOURCE_BYTES) return drop()
    // Read with a cap: content-length can be missing or wrong.
    const reader = res.body.getReader()
    const chunks: Uint8Array[] = []
    let size = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_SOURCE_BYTES) {
        reader.cancel().catch(() => {})
        return null
      }
      chunks.push(value)
    }
    return Buffer.concat(chunks)
  }
  return null
}

async function readSource(url: string): Promise<Buffer | null> {
  if (url.startsWith(UPLOAD_PREFIX)) {
    const key = storageKeyOf(url.slice(UPLOAD_PREFIX.length))
    return key ? await useStorage('uploads').getItemRaw<Buffer>(key) : null
  }
  return fetchSource(url)
}

// Many "logos" are favicons — an .ico file, whatever the extension says — which sharp
// can't read. Take the largest image inside: a PNG as is, or a 32-bit BMP (the usual
// kind) decoded to raw RGBA pixels. Other BMP depths (old palette icons) aren't
// converted; the browser then shows the original.
type SharpInput = { data: Buffer; raw?: { width: number; height: number; channels: 4 } }

function imageFromIco(data: Buffer): SharpInput | null {
  if (data.length < 6 || data.readUInt16LE(0) !== 0 || data.readUInt16LE(2) !== 1) return null
  const count = data.readUInt16LE(4)
  let best: SharpInput | null = null
  let bestWidth = 0
  for (let i = 0; i < count && 6 + (i + 1) * 16 <= data.length; i++) {
    const entry = 6 + i * 16
    const width = data[entry] || 256
    const size = data.readUInt32LE(entry + 8)
    const offset = data.readUInt32LE(entry + 12)
    if (offset + size > data.length || width <= bestWidth) continue
    const image = data.subarray(offset, offset + size)
    const decoded = detectImage(image)?.ext === 'png' ? { data: image } : bmp32ToRgba(image)
    if (decoded) {
      best = decoded
      bestWidth = width
    }
  }
  return best
}

// An icon's BMP: BITMAPINFOHEADER, then BGRA rows bottom-up, then a 1-bit AND mask
// (its height counts the mask too, so it's twice the image's). Old icons leave the
// alpha bytes at 0 and mark transparency in the mask only — read as is, they would
// come out fully transparent, so then the mask decides.
function bmp32ToRgba(dib: Buffer): SharpInput | null {
  if (dib.length < 40 || dib.readUInt32LE(0) !== 40 || dib.readUInt16LE(14) !== 32 || dib.readUInt32LE(16) !== 0) return null
  const width = dib.readInt32LE(4)
  const fullHeight = dib.readInt32LE(8)
  const height = Math.abs(fullHeight) / 2
  if (width <= 0 || width > 1024 || !Number.isInteger(height) || height <= 0 || height > 1024) return null
  const pixelBytes = width * height * 4
  if (40 + pixelBytes > dib.length) return null
  const bottomUp = fullHeight > 0
  const maskRow = Math.ceil(width / 32) * 4
  const hasMask = 40 + pixelBytes + maskRow * height <= dib.length
  let anyAlpha = false
  for (let i = 40 + 3; i < 40 + pixelBytes; i += 4) {
    if (dib[i]) {
      anyAlpha = true
      break
    }
  }
  const out = Buffer.alloc(pixelBytes)
  for (let y = 0; y < height; y++) {
    const srcY = bottomUp ? height - 1 - y : y
    const row = 40 + srcY * width * 4
    const mask = 40 + pixelBytes + srcY * maskRow
    for (let x = 0; x < width; x++) {
      const from = row + x * 4
      const to = (y * width + x) * 4
      out[to] = dib[from + 2]!
      out[to + 1] = dib[from + 1]!
      out[to + 2] = dib[from]!
      out[to + 3] = anyAlpha
        ? dib[from + 3]!
        : hasMask && (dib[mask + (x >> 3)]! >> (7 - (x & 7))) & 1 ? 0 : 255
    }
  }
  return { data: out, raw: { width, height, channels: 4 } }
}

let renders = 0
const waiting: (() => void)[] = []

async function limited<T>(task: () => Promise<T>): Promise<T> {
  if (renders >= MAX_RENDERS) {
    if (waiting.length >= MAX_QUEUED) throw new Busy()
    await new Promise<void>(resolve => waiting.push(resolve))
  }
  renders++
  try {
    return await task()
  } finally {
    renders--
    waiting.shift()?.()
  }
}

async function render(url: string, width: number, square: boolean): Promise<Buffer | null> {
  const raw = await readSource(url).catch((error) => {
    if (error instanceof Busy) throw error
    return null
  })
  if (!raw) return null
  const data = Buffer.from(raw)
  // Raster formats only (same rule as uploads): no SVG through the resizer.
  const source: SharpInput | null = detectImage(data) ? { data } : imageFromIco(data)
  if (!source) return null
  return sharp(source.data, { limitInputPixels: 50_000_000, failOn: 'error', ...(source.raw && { raw: source.raw }) })
    .rotate()
    .resize(square ? { width, height: width, fit: 'cover', withoutEnlargement: true } : { width, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer()
    .catch(() => null)
}

// 404, cacheable as long as the failure is remembered: the page falls back to the
// original image right away, and the browser needn't ask again on every page.
function unavailable(event: H3Event) {
  setResponseStatus(event, 404, 'Image unavailable')
  setResponseHeader(event, 'Cache-Control', `public, max-age=${FAILURE_TTL_MS / 1000}`)
  return ''
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const url = typeof query.u === 'string' ? query.u : ''
  const width = Number(query.w)
  const square = query.c === '1' // logos: cropped to a square, like object-cover
  if (!isProxiableImage(url) || !(IMAGE_PROXY_WIDTHS as readonly number[]).includes(width)) {
    throw createError({ statusCode: 400, statusMessage: 'Bad image request' })
  }

  const key = `${createHash('sha256').update(`${url}|${width}|${square ? 'c' : ''}`).digest('hex')}.webp`
  const storage = useStorage('image-cache')
  let image = await storage.getItemRaw<Buffer>(key)

  if (!image) {
    const failed = failedAt.get(key)
    if (failed && Date.now() - failed < FAILURE_TTL_MS) return unavailable(event)

    let job = inFlight.get(key)
    if (!job) {
      // Shared by every request for this image meanwhile; it alone writes the cache.
      job = limited(() => render(url, width, square))
        .then(async (result) => {
          if (result) await storage.setItemRaw(key, result).catch(() => {})
          return result
        })
        .finally(() => inFlight.delete(key))
      inFlight.set(key, job)
    }
    try {
      image = await job
    } catch (error) {
      if (!(error instanceof Busy)) throw error
      // The page falls back to the original; asked again next time.
      setResponseStatus(event, 404, 'Image busy')
      setResponseHeader(event, 'Cache-Control', 'no-store')
      return ''
    }
    if (!image) {
      if (failedAt.size > 5000) failedAt.clear()
      failedAt.set(key, Date.now())
      return unavailable(event)
    }
  }

  setResponseHeaders(event, {
    'Content-Type': 'image/webp',
    'Cache-Control': 'public, max-age=2592000, immutable',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'"
  })
  return Buffer.from(image)
})
