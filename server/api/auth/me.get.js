import { jwtVerify } from 'jose'

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'session')
  if (!token) throw createError({ statusCode: 401, statusMessage: 'No session' })

  const cfg = useRuntimeConfig()
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(cfg.jwtSecret))
    // attach for downstream if you like
    event.context.user = payload
    return { user: { username: payload.sub, role: payload.role } }
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Invalid/expired session' })
  }
})
