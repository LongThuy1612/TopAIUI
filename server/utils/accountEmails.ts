import { createHash, randomBytes } from 'node:crypto'
import type { MailMessage } from './mailer'

// One-time links for email verification and password reset. Only the token's
// SHA-256 is stored, so a leaked database row can't be turned into a link.
export const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour
// At most one email of each kind per account per minute.
const RESEND_COOLDOWN_MS = 60 * 1000

export const PASSWORD_MIN_LENGTH = 6
export const PASSWORD_MAX_LENGTH = 200

export function hashEmailToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function newEmailToken() {
  const token = randomBytes(32).toString('base64url')
  return { token, hash: hashEmailToken(token) }
}

// The send time isn't stored: it is expiry − TTL.
export function sentRecently(expiry: Date | null, ttlMs: number) {
  return !!expiry && expiry.getTime() - ttlMs > Date.now() - RESEND_COOLDOWN_MS
}

export function assertValidPassword(password: unknown): asserts password is string {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
    throw createError({ statusCode: 400, statusMessage: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` })
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    throw createError({ statusCode: 400, statusMessage: 'Password is too long' })
  }
}

// A mail that never left mustn't count as sent: drop its token so the
// per-minute cooldown (sentRecently) doesn't block an immediate retry.
async function sendOrForget(forget: () => Promise<unknown>, message: MailMessage) {
  try {
    await sendMail(message)
  } catch (err) {
    await forget().catch(() => {})
    throw err
  }
}

function link(path: string, token: string) {
  const base = useRuntimeConfig().public.siteUrl.replace(/\/+$/, '')
  return `${base}${path}?token=${token}`
}

export async function sendVerificationEmail(user: { id: string; email: string }) {
  const { token, hash } = newEmailToken()
  await prisma.user.update({
    where: { id: user.id },
    data: { verificationToken: hash, verificationTokenExpiry: new Date(Date.now() + VERIFY_TOKEN_TTL_MS) }
  })
  await sendOrForget(() => prisma.user.updateMany({
    where: { id: user.id, verificationToken: hash },
    data: { verificationToken: null, verificationTokenExpiry: null }
  }), actionMail({
    to: user.email,
    subject: 'Confirm your email — TopAICollection',
    intro: 'Thanks for signing up to TopAICollection. Please confirm this is your email address.',
    action: 'Confirm email',
    url: link('/verify-email', token),
    outro: 'This link expires in 24 hours. If you didn\'t create an account, you can ignore this email.'
  }))
}

export async function sendPasswordResetEmail(user: { id: string; email: string }) {
  const { token, hash } = newEmailToken()
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordResetToken: hash, passwordResetTokenExpiry: new Date(Date.now() + RESET_TOKEN_TTL_MS) }
  })
  await sendOrForget(() => prisma.user.updateMany({
    where: { id: user.id, passwordResetToken: hash },
    data: { passwordResetToken: null, passwordResetTokenExpiry: null }
  }), actionMail({
    to: user.email,
    subject: 'Reset your password — TopAICollection',
    intro: 'We received a request to reset the password for your TopAICollection account.',
    action: 'Reset password',
    url: link('/reset-password', token),
    outro: 'This link expires in 1 hour and can be used once. If you didn\'t ask for this, ignore this email — your password stays the same.'
  }))
}
