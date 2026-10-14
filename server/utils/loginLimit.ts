import type { H3Event } from 'h3'

// Failed sign-ins, kept in memory (one server), over WINDOW_MS:
//   per account + visitor  LIMIT_PER_PAIR — the normal guessing case; a stranger can't lock
//                          the owner out of their own account from the owner's own device
//   per account            LIMIT_PER_EMAIL — guessing spread over many addresses
//   per visitor            LIMIT_PER_IP — one address trying many accounts
// A visitor is an IPv4 address or an IPv6 /64 (visitorKey): an IPv6 host owns a whole /64
// and could otherwise take a new address for every try. A successful sign-in clears the
// account's counts. Also stops the CPU each scrypt check costs.
const WINDOW_MS = 15 * 60 * 1000
const LIMIT_PER_PAIR = 8
const LIMIT_PER_EMAIL = 50
const LIMIT_PER_IP = 30
const failures = new Map<string, number[]>()

function recent(key: string, now: number) {
  const list = (failures.get(key) ?? []).filter(t => now - t < WINDOW_MS)
  if (list.length) failures.set(key, list)
  else failures.delete(key)
  return list
}

const keysOf = (event: H3Event, email: string) => {
  const ip = visitorKey(visitorIp(event))
  return { pair: `p:${email}|${ip}`, email: `e:${email}`, ip: `i:${ip}` }
}

export function assertLoginAllowed(event: H3Event, email: string) {
  const now = Date.now()
  const k = keysOf(event, email)
  if (recent(k.pair, now).length >= LIMIT_PER_PAIR || recent(k.email, now).length >= LIMIT_PER_EMAIL || recent(k.ip, now).length >= LIMIT_PER_IP) {
    throw createError({ statusCode: 429, statusMessage: 'Too many attempts', message: 'Too many sign-in attempts. Please try again in 15 minutes.' })
  }
}

export function noteLoginFailure(event: H3Event, email: string) {
  const now = Date.now()
  if (failures.size > 50_000) failures.clear() // a flood of random keys must not grow it for ever
  for (const key of Object.values(keysOf(event, email))) failures.set(key, [...recent(key, now), now])
}

export function clearLoginFailures(event: H3Event, email: string) {
  const k = keysOf(event, email)
  failures.delete(k.pair)
  failures.delete(k.email)
}
