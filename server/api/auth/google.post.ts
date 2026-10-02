import { Prisma } from '@prisma/client'
import { createRemoteJWKSet, jwtVerify } from 'jose'

// Google's ID-token signing keys. jose caches the key set and refetches on
// rotation, so this stays module-level.
const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'))

interface GoogleIdToken {
  sub: string
  email?: string
  email_verified?: boolean
  name?: string
  picture?: string
  hd?: string
}

// Google marks an email "verified" for any Google account, including ones
// created with a third-party address (abc@company.com) — whose owner may
// later lose that mailbox but keep the Google account. Only those emails
// Google itself controls are trusted enough to take over an existing
// password account: Gmail addresses, and Workspace accounts (`hd` claim =
// the domain the organisation administers).
function isGoogleAuthoritative(email: string, hd: string | undefined) {
  const domain = email.split('@')[1]!
  if (GMAIL_DOMAINS.includes(domain)) return true
  return !!hd && hd.toLowerCase() === domain
}

// Existing account for this email: exact match first, else (Gmail only) one
// whose address is the same mailbox written differently. Several such
// accounts → ambiguous, return null and let the caller refuse.
async function findAccountByEmail(email: string) {
  const exact = await prisma.user.findUnique({ where: { email } })
  if (exact) return { user: exact, ambiguous: false }

  const ids = await findSameGmailMailbox(email)
  if (ids.length !== 1) return { user: null, ambiguous: ids.length > 1 }
  return { user: await prisma.user.findUnique({ where: { id: ids[0]! } }), ambiguous: false }
}

function assertActive(user: { isBanned: boolean; deletedAt: Date | null }) {
  if (user.isBanned || user.deletedAt) {
    throw createError({ statusCode: 403, statusMessage: 'This account has been banned' })
  }
}

// "Sign in with Google": the client gets an ID token (JWT) from Google
// Identity Services and posts it here. We verify it, then find/create the
// user and hand back the same session token as /api/auth/login.
export default defineEventHandler(async (event) => {
  const { googleClientId } = useRuntimeConfig().public
  if (!googleClientId) {
    throw createError({ statusCode: 500, statusMessage: 'Google sign-in is not configured' })
  }

  const body = await readBody(event)
  const credential = typeof body?.credential === 'string' ? body.credential : ''
  if (!credential) {
    throw createError({ statusCode: 400, statusMessage: 'Missing Google credential' })
  }

  let claims: GoogleIdToken
  try {
    const { payload } = await jwtVerify(credential, GOOGLE_JWKS, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: googleClientId,
      // Tolerate small server clock drift around iat/exp.
      clockTolerance: 60
    })
    claims = payload as unknown as GoogleIdToken
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Invalid Google credential' })
  }

  const email = claims.email?.trim().toLowerCase()
  if (!claims.sub || !email || claims.email_verified !== true) {
    throw createError({ statusCode: 401, statusMessage: 'Google account email is not verified' })
  }

  // Match by Google id first; otherwise link to an existing account with the
  // same (Google-verified) email, or create a new one.
  let user = await prisma.user.findUnique({ where: { googleId: claims.sub } })
  if (!user) {
    const { user: byEmail, ambiguous } = await findAccountByEmail(email)
    if (ambiguous) {
      throw createError({ statusCode: 409, statusMessage: 'Email already registered — sign in with your password' })
    }
    if (byEmail) {
      // Check before linking so a banned account isn't modified.
      assertActive(byEmail)
      // Already tied to a different Google account — don't silently re-link —
      // or the email isn't one Google is authoritative for: the user has to
      // sign in with their password instead.
      if ((byEmail.googleId && byEmail.googleId !== claims.sub) || !isGoogleAuthoritative(email, claims.hd)) {
        throw createError({ statusCode: 409, statusMessage: 'Email already registered — sign in with your password' })
      }
      // Sign-up never verified the email, so whoever set this password may
      // not own the address (someone can register victim@gmail.com first).
      // Google just proved ownership — drop the unproven password so it
      // can't keep working on the now-linked account.
      const dropPassword = !byEmail.emailVerified && !!byEmail.password
      user = await prisma.user.update({
        where: { id: byEmail.id },
        data: {
          googleId: claims.sub,
          emailVerified: true,
          ...(dropPassword && { password: null, hasSetPassword: false, passwordChangedAt: new Date() }),
          name: byEmail.name || claims.name || undefined,
          avatarUrl: byEmail.avatarUrl || claims.picture || undefined
        }
      })
    } else {
      try {
        user = await prisma.user.create({
          data: {
            email,
            googleId: claims.sub,
            name: claims.name?.trim() || email.split('@')[0],
            avatarUrl: claims.picture || null,
            role: 'USER',
            emailVerified: true,
            hasSetPassword: false
          }
        })
      } catch (err) {
        // Two first-time sign-ins racing (double click, two tabs): the other
        // request created the user first — use that row.
        if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) throw err
        user = await prisma.user.findUnique({ where: { googleId: claims.sub } })
        if (!user) throw err
      }
    }
  }

  assertActive(user)

  const token = createUserToken(user.id)
  return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } }
})
