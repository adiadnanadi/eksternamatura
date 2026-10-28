import 'server-only'
import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || 'dev-fallback-secret-change-me'
)
const COOKIE = 'kviz_token'
const MAX_AGE = 60 * 60 * 24 * 30 // 30 dana

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10)
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash)
}

export async function createSessionToken(userId: string, email: string) {
  return new SignJWT({ uid: userId, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(SECRET)
}

export async function setAuthCookie(token: string) {
  const store = await cookies()
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false, // sandbox radi preko https proxy-ja, cookie ostaje functional
    maxAge: MAX_AGE,
    path: '/',
  })
}

export async function clearAuthCookie() {
  const store = await cookies()
  store.set(COOKIE, '', { httpOnly: true, maxAge: 0, path: '/' })
}

export async function getAuthUserId(): Promise<string | null> {
  try {
    const store = await cookies()
    const token = store.get(COOKIE)?.value
    if (!token) return null
    const { payload } = await jwtVerify(token, SECRET)
    return (payload.uid as string) || null
  } catch {
    return null
  }
}
