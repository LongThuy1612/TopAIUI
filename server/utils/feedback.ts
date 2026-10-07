import type { H3Event } from 'h3'
import type { FeedbackStatus, FeedbackType } from '@prisma/client'
import { randomUUID } from 'node:crypto'

// Dashboard → Feedback. Attachments live in the private Nitro storage mount
// "feedback" (nuxt.config.ts): not the public "uploads" one, whose files are
// served to anyone at /uploads/… and deleted nightly when no tool uses them.
// They are only read back through /api/feedback/<id>/attachment.

export const FEEDBACK_TYPES: FeedbackType[] = ['FEATURE', 'ISSUE', 'BILLING', 'OTHER']
export const FEEDBACK_STATUSES: FeedbackStatus[] = ['NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']

export const FEEDBACK_MIN_LENGTH = 10
export const FEEDBACK_MAX_LENGTH = 1000
export const FEEDBACK_NOTE_MAX_LENGTH = 2000

// readMultipartFormData buffers the whole body in memory, so keep this modest.
export const FEEDBACK_MAX_BYTES = 20 * 1024 * 1024

// Per user, counted from the Feedback table — no extra state needed.
export const FEEDBACK_LIMITS = [
  { windowMs: 60 * 60 * 1000, max: 5 },
  { windowMs: 24 * 60 * 60 * 1000, max: 20 }
]

// Major brands of MP4 video files (phones, screen recorders, browsers, ffmpeg).
const MP4_BRANDS = new Set(['isom', 'iso2', 'iso4', 'iso5', 'iso6', 'mp41', 'mp42', 'mp71', 'avc1', 'M4V ', 'M4VH', 'M4VP', 'dash', 'mmp4', 'MSNV', 'f4v '])

// Screenshots and screen recordings, detected from the file's bytes — never
// trust the client's filename / content-type. SVG and HTML are left out: they
// can carry script.
const SIGNATURES: { ext: string; type: string; test: (b: Buffer) => boolean }[] = [
  { ext: 'png', type: 'image/png', test: b => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: 'jpg', type: 'image/jpeg', test: b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'webp', type: 'image/webp', test: b => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' },
  { ext: 'gif', type: 'image/gif', test: b => b.toString('ascii', 0, 4) === 'GIF8' },
  // ISO base media: "ftyp" box at offset 4, then the major brand. HEIC / AVIF
  // photos use the same container, so only known video brands count.
  { ext: 'mov', type: 'video/quicktime', test: b => b.toString('ascii', 4, 8) === 'ftyp' && b.toString('ascii', 8, 12) === 'qt  ' },
  { ext: 'mp4', type: 'video/mp4', test: b => b.toString('ascii', 4, 8) === 'ftyp' && MP4_BRANDS.has(b.toString('ascii', 8, 12)) },
  // Matroska / WebM: EBML header.
  { ext: 'webm', type: 'video/webm', test: b => b.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])) }
]

export const FEEDBACK_CONTENT_TYPES: Record<string, string> = Object.fromEntries(SIGNATURES.map(s => [s.ext, s.type]))

export function detectFeedbackAttachment(data: Buffer) {
  return SIGNATURES.find(s => data.length > 12 && s.test(data)) ?? null
}

// Only keys we generated ourselves: <32 hex>.<ext>.
const SAFE_KEY = /^[a-f0-9]{32}\.(png|jpg|webp|gif|mov|mp4|webm)$/

export function isFeedbackAttachmentKey(key: string) {
  return SAFE_KEY.test(key)
}

// Errors carry a stable code in data.code, so the form can show translated
// text without parsing the English message.
export type FeedbackErrorCode = 'TOO_SHORT' | 'TOO_LONG' | 'BAD_TYPE' | 'FILE_TYPE' | 'FILE_TOO_LARGE' | 'RATE_LIMIT' | 'NO_LENGTH'

export function feedbackError(code: FeedbackErrorCode, message: string, statusCode = 400) {
  return createError({ statusCode, statusMessage: message, message, data: { code } })
}

export interface FeedbackForm {
  type: string
  message: string
  locale: string
  file: { data: Buffer; filename?: string } | null
}

// Reads the multipart body: fields "type", "message", "locale" and an optional
// file "file". The size is checked from Content-Length before anything is read.
export async function readFeedbackForm(event: H3Event): Promise<FeedbackForm> {
  const length = Number(getHeader(event, 'content-length'))
  if (!Number.isFinite(length) || length <= 0) throw feedbackError('NO_LENGTH', 'Content-Length is required.', 411)
  // Allow some room for the text fields and multipart boundaries.
  if (length > FEEDBACK_MAX_BYTES + 64 * 1024) throw feedbackError('FILE_TOO_LARGE', 'Attachment must be 20 MB or smaller.', 413)

  const parts = await readMultipartFormData(event) ?? []
  const field = (name: string) => parts.find(p => p.name === name && !p.filename)?.data.toString('utf8') ?? ''
  const filePart = parts.find(p => p.name === 'file' && p.filename !== undefined && p.data?.length)
  return {
    type: field('type'),
    message: field('message'),
    locale: field('locale'),
    file: filePart ? { data: filePart.data, filename: filePart.filename } : null
  }
}

// Original file name for display only: no path, no control characters.
export function cleanFileName(name: string | undefined) {
  const base = String(name ?? '').split(/[\\/]/).pop() ?? ''
  // eslint-disable-next-line no-control-regex
  return base.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 200) || null
}

export async function saveFeedbackAttachment(data: Buffer, ext: string) {
  const key = `${randomUUID().replaceAll('-', '')}.${ext}`
  await useStorage('feedback').setItemRaw(key, data)
  return key
}

export async function readFeedbackAttachment(key: string) {
  if (!isFeedbackAttachmentKey(key)) return null
  return await useStorage('feedback').getItemRaw<Buffer>(key)
}

export async function removeFeedbackAttachment(key: string | null | undefined) {
  if (key && isFeedbackAttachmentKey(key)) await useStorage('feedback').removeItem(key)
}
