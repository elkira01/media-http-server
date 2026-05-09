import type { MiddlewareHandler } from 'hono'
import { db } from './db'
import { uuidv7 } from './uuid'

const BEARER_PREFIX = 'Bearer '
const ACCESS_TTL = 15 * 60 * 1000 // 15 minutes
const REFRESH_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is not configured')
  return new TextEncoder().encode(secret)
}

// --- JWT helpers (HS256) ---

function base64url(input: Uint8Array | string): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(padded)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

async function hmacSign(payload: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', getJwtSecret(), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, payload))
}

async function hmacVerify(payload: Uint8Array, signature: Uint8Array): Promise<boolean> {
  const key = await crypto.subtle.importKey('raw', getJwtSecret(), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
  return crypto.subtle.verify('HMAC', key, signature, payload)
}

export interface JwtPayload {
  sub: string
  type: 'access' | 'refresh'
  iat: number
  exp: number
}

export async function signJwt(payload: JwtPayload): Promise<string> {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = base64url(JSON.stringify(payload))
  const signingInput = new TextEncoder().encode(`${header}.${body}`)
  const sig = await hmacSign(signingInput)
  return `${header}.${body}.${base64url(sig)}`
}

export async function verifyJwt(token: string): Promise<JwtPayload | null> {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [header, body, signature] = parts
  const signingInput = new TextEncoder().encode(`${header}.${body}`)
  const sigBytes = base64urlDecode(signature)
  const valid = await hmacVerify(signingInput, sigBytes)
  if (!valid) return null
  try {
    const payload: JwtPayload = JSON.parse(new TextDecoder().decode(base64urlDecode(body)))
    if (payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

// --- Password helpers ---

export async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return Bun.password.verify(password, hash)
}

// --- Token pair generation ---

export async function generateTokenPair(userId: string) {
  const now = Date.now()

  const accessToken = await signJwt({ sub: userId, type: 'access', iat: now, exp: now + ACCESS_TTL })
  const refreshTokenValue = crypto.randomUUID()
  const refreshTokenHash = await hashRefreshToken(refreshTokenValue)

  const id = uuidv7()
  const expiresAt = new Date(now + REFRESH_TTL).toISOString()
  db.query('INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)').run(id, userId, refreshTokenHash, expiresAt)

  return { accessToken, refreshToken: refreshTokenValue }
}

async function hashRefreshToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function revokeRefreshToken(tokenValue: string) {
  const hash = await hashRefreshToken(tokenValue)
  db.query('DELETE FROM refresh_tokens WHERE token_hash = ?').run(hash)
}

export async function findRefreshToken(tokenValue: string) {
  const hash = await hashRefreshToken(tokenValue)
  return db.query('SELECT * FROM refresh_tokens WHERE token_hash = ? AND expires_at > datetime("now")').get(hash) as {
    id: string
    user_id: string
    token_hash: string
    expires_at: string
    created_at: string
  } | null
}

// --- Middleware ---

function isPublicRoute(method: string, path: string) {
  if (method === 'GET' && /^\/files\/[^/]+$/.test(path)) return true
  if (path.startsWith('/auth/')) return true
  return false
}

export const tokenAuth: MiddlewareHandler = async (c, next) => {
  if (isPublicRoute(c.req.method, c.req.path)) {
    return next()
  }

  const authHeader = c.req.header('authorization')
  if (!authHeader?.startsWith(BEARER_PREFIX)) {
    return c.json({ error: 'missing bearer token' }, 401)
  }

  const token = authHeader.slice(BEARER_PREFIX.length)
  let payload: JwtPayload
  try {
    const result = await verifyJwt(token)
    if (!result) return c.json({ error: 'invalid or expired token' }, 401)
    payload = result
  } catch {
    return c.json({ error: 'invalid or expired token' }, 401)
  }

  if (payload.type !== 'access') {
    return c.json({ error: 'expected access token' }, 401)
  }

  c.set('userId', payload.sub)
  return next()
}
