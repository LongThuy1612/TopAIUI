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

    return userId
  } catch {
    return null
  }
}

export function requireUser(event: H3Event): string {
  const token = getHeader(event, 'x-user-token')
  const userId = token ? verifyUserToken(token) : null

  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  return userId
}

// Like requireUser, plus the account must still be active. Login tokens are stateless
// and live 30 days, so a user banned or deleted after logging in still holds a valid one:
// endpoints that spend quota, change data or touch billing check the account too.
export async function requireActiveUser(event: H3Event): Promise<string> {
  const userId = requireUser(event)
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isBanned: true, deletedAt: true } })
  if (!user || user.isBanned || user.deletedAt) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  return userId
}
