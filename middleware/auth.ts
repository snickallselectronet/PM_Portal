import { jwtVerify } from 'jose'

export default defineEventHandler(async (event) => {
  // Allow public auth endpoints through
  const url = getRequestURL(event)
  if (url.pathname.startsWith('/api/auth/')) return

  // If no cookie, just continue; the route middleware will handle redirects
  const token = getCookie(event, 'session')
  if (!token) return

  try {
    const cfg = useRuntimeConfig()
    const { payload } = await jwtVerify(token, new TextEncoder().encode(cfg.jwtSecret))
    event.context.user = payload
  } catch {
    // Invalid/expired token: do nothing here; client middleware will redirect
  }
})
