import type { H3Event } from 'h3'
import { randomUUID } from 'node:crypto'

// Image uploads (tool logos / screenshots). Files live in the Nitro storage
// mount "uploads" (fs driver, see nuxt.config.ts → nitro.storage) and are
// served back by server/routes/uploads/[...path].get.ts at /uploads/<path>.
// Swapping the driver (e.g. to S3/R2) needs no change here.

export const UPLOAD_PREFIX = '/uploads/'

// Raster formats only, detected from the file's bytes — never trust the
// client's filename / content-type. SVG is left out on purpose: it can carry
// script and would run on our origin.
const SIGNATURES: { ext: string; type: string; test: (b: Buffer) => boolean }[] = [
  { ext: 'png', type: 'image/png', test: b => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: 'jpg', type: 'image/jpeg', test: b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'webp', type: 'image/webp', test: b => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' },
  { ext: 'gif', type: 'image/gif', test: b => b.toString('ascii', 0, 4) === 'GIF8' }
]

export const CONTENT_TYPES: Record<string, string> = Object.fromEntries(SIGNATURES.map(s => [s.ext, s.type]))

export function detectImage(data: Buffer) {
  return SIGNATURES.find(s => data.length > 12 && s.test(data)) ?? null
}

// Only lowercase path segments we generated ourselves — no "..", no odd characters.
const SAFE_PATH = /^[a-z0-9_-]+(\/[a-z0-9_-]+)*\.(png|jpg|webp|gif)$/

export function storageKeyOf(path: string) {
  return SAFE_PATH.test(path) ? path.replaceAll('/', ':') : null
}

// Saves the bytes under <folder>/<uuid>.<ext> and returns the public URL.
export async function saveImage(folder: string, data: Buffer, ext: string) {
  const path = `${folder}/${randomUUID().replaceAll('-', '')}.${ext}`
  const key = storageKeyOf(path)
  if (!key) throw new Error(`Unsafe upload path: ${path}`)
  await useStorage('uploads').setItemRaw(key, data)
  return UPLOAD_PREFIX + path
}

// A URL a tool may point at: one of our uploads or any external http(s) image
// (crawled tools keep their source URLs).
export function isImageUrl(url: string) {
  if (url.startsWith(UPLOAD_PREFIX)) return storageKeyOf(url.slice(UPLOAD_PREFIX.length)) !== null
  return hostOf(url) !== null
}

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

// Reads the multipart field "file" and checks it is a real image within the
// size limit. Shared by the owner and admin upload endpoints.
export async function readImageUpload(event: H3Event) {
  const bad = (message: string, statusCode = 400) => createError({ statusCode, statusMessage: message, message })

  // readMultipartFormData buffers the whole body, so the size must be known and
  // checked first. Without Content-Length (chunked upload) we can't — refuse it
  // rather than letting a client stream gigabytes into memory. Browsers always
  // send it for FormData.
  const length = Number(getHeader(event, 'content-length'))
  if (!Number.isFinite(length) || length <= 0) throw bad('Content-Length is required.', 411)
  if (length > MAX_UPLOAD_BYTES + 64 * 1024) throw bad('Image must be 5 MB or smaller.', 413)

  const file = (await readMultipartFormData(event))?.find(p => p.name === 'file' && p.data?.length)
  if (!file) throw bad('No file uploaded.')
  if (file.data.length > MAX_UPLOAD_BYTES) throw bad('Image must be 5 MB or smaller.', 413)

  const image = detectImage(file.data)
  if (!image) throw bad('Only PNG, JPG, WebP or GIF images are allowed.')
  return { data: file.data, ext: image.ext }
}

// Validates a tool's screenshot list (uploads or http(s) URLs) and returns the
// fields to store: images[] plus screenshotUrl = the first one, which is what
// the public tool page falls back to.
export function toolImagesData(value: unknown, max = 6) {
  const bad = (message: string) => createError({ statusCode: 400, statusMessage: message, message })
  if (!Array.isArray(value)) throw bad('Invalid images.')
  const images = [...new Set(value.map(v => (typeof v === 'string' ? v.trim() : '')).filter(Boolean))]
  if (images.length > max) throw bad(`At most ${max} screenshots.`)
  const invalid = images.find(u => !isImageUrl(u))
  if (invalid) throw bad(`Invalid image: ${invalid}`)
  return { images, screenshotUrl: images[0] ?? null }
}
