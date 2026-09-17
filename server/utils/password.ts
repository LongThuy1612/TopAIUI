import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: string,
  keylen: number,
  options: ScryptOptions
) => Promise<Buffer>

// scrypt cost params - bump N if the server can afford it (Node default: N=16384)
const SCRYPT_OPTIONS: ScryptOptions = {
  N: 32768, // cost factor (2^15)
  r: 8, // block size
  p: 1, // parallelization
  maxmem: 64 * 1024 * 1024 // 64MB, must fit 128*N*r
}

const KEY_LENGTH = 64

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const hash = await scryptAsync(password, salt, KEY_LENGTH, SCRYPT_OPTIONS)
  return `${salt}:${hash.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [salt, hash] = stored.split(':')
    if (!salt || !hash) return false

    const hashBuffer = Buffer.from(hash, 'hex')
    const candidate = await scryptAsync(password, salt, KEY_LENGTH, SCRYPT_OPTIONS)

    return candidate.length === hashBuffer.length && timingSafeEqual(candidate, hashBuffer)
  } catch {
    return false
  }
}
