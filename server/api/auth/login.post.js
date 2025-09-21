import { SignJWT } from 'jose'
import { setCookie } from 'h3'

export default defineEventHandler(async (event) => {
  const { username, password } = await readBody(event) || {}
  const cfg = useRuntimeConfig()

  if (!username || !password) {
    throw createError({ statusCode: 400, statusMessage: 'Missing credentials' })
  }

  const okUser = username === cfg.authUser
  const okPass = password === cfg.authPass   // <-- plaintext compare

  if (!okUser || !okPass) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
  }

  const token = await new SignJWT({ sub: username, role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(new TextEncoder().encode(cfg.jwtSecret))

  setCookie(event, 'session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7
  })

  return { ok: true }
})
