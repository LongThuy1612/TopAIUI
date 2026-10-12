import type { H3Event } from 'h3'
import { createHmac, timingSafeEqual } from 'node:crypto'

// Stateless signed session token: base64url("<userId>.<expiresAt>.<hmac>").
// No session table needed. Good enough for this app's scope; swap for a
// real session store / rotating refresh tokens before this needs to survive
// secret rotation or per-device revocation.
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

function sign(payload: string, secret: string) {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

export function createUserToken(userId: string): string {
  const config = useRuntimeConfig()
  const expiresAt = Date.now() + TOKEN_TTL_MS
  const payload = `${userId}.${expiresAt}`
  const signature = sign(payload, config.userTokenSecret)
  return Buffer.from(`${payload}.${signature}`).toString('base64url')
}

export function verifyUserToken(token: string): string | null {
  return readUserToken(token)?.userId ?? null
}

// The token carries no issue time of its own; it is expiresAt − TTL, so
// changing TOKEN_TTL_MS shifts it for tokens already out there.
function readUserToken(token: string): { userId: string; issuedAt: number } | null {
  try {
    const config = useRuntimeConfig()
    const decoded = Buffer.from(token, 'base64url').toString('utf8')
    const [userId, expiresAtStr, signature] = decoded.split('.')
    if (!userId || !expiresAtStr || !signature) return null

    const expiresAt = Number(expiresAtStr)
    if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null

    const expected = sign(`${userId}.${expiresAtStr}`, config.userTokenSecret)
    const expectedBuf = Buffer.from(expected)
    const actualBuf = Buffer.from(signature)
    if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) return null

    return { userId, issuedAt: expiresAt - TOKEN_TTL_MS }
  } catch {
    return null
  }
}

export function requireUserSession(event: H3Event) {
  const token = getHeader(event, 'x-user-token')
  const session = token ? readUserToken(token) : null

  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  return session
}

export function requireUser(event: H3Event): string {
  return requireUserSession(event).userId
}

// Account state the stateless token can't carry: banned / deleted since login,
// or the password changed (reset, change, admin) after the token was issued —
// that logs every other device out.
export function isSessionUsable(
  user: { isBanned: boolean; deletedAt: Date | null; passwordChangedAt: Date | null } | null,
  issuedAt: number
) {
  if (!user || user.isBanned || user.deletedAt) return false
  return !user.passwordChangedAt || issuedAt >= user.passwordChangedAt.getTime()
}

// Like requireUser, plus the account must still be active. Login tokens are stateless
// and live 30 days, so a user banned or deleted after logging in still holds a valid one:
// endpoints that spend quota, change data or touch billing check the account too.
export async function requireActiveUser(event: H3Event): Promise<string> {
  const { userId, issuedAt } = requireUserSession(event)
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isBanned: true, deletedAt: true, passwordChangedAt: true } })
  if (!isSessionUsable(user, issuedAt)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  return userId
}

// The user object every auth endpoint (login, register, Google, me, reset) returns.
export function authUserPayload(user: { id: string; email: string; name: string | null; role: string; emailVerified: boolean; password: string | null }) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    emailVerified: user.emailVerified,
    // Google-only accounts have none yet; the dashboard then offers "set" instead of "change".
    hasPassword: !!user.password
  }
}
