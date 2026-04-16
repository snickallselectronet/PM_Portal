// server/utils/requireAuth.js
// Nitro auto-imports everything from server/utils/ — no import needed in routes.
// Functions must be defined at the top level (not inside an export default object).

export async function requireAuth(event, { role } = {}) {
  const cfg = useRuntimeConfig()

  const authHeader = getHeader(event, 'authorization') || ''
  const token = authHeader.replace('Bearer ', '').trim()

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'No authorization token' })
  }

  // Verify token with Supabase
  const res = await fetch(`${cfg.supabaseUrl}/auth/v1/user`, {
    headers: {
      'apikey':        cfg.supabaseSecretKey,
      'Authorization': `Bearer ${token}`
    }
  })

  if (!res.ok) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid or expired session' })
  }

  const supabaseUser = await res.json()

  // Fetch role from user_profiles using secret key
  const profileRes = await fetch(
    `${cfg.supabaseUrl}/rest/v1/user_profiles?id=eq.${supabaseUser.id}&select=role`,
    {
      headers: {
        'apikey':        cfg.supabaseSecretKey,
        'Authorization': `Bearer ${cfg.supabaseSecretKey}`,
        'Accept':        'application/json'
      }
    }
  )

  const profiles = await profileRes.json()
  const userRole = profiles?.[0]?.role || null

  if (!userRole) {
    throw createError({ statusCode: 403, statusMessage: 'No role assigned to this user' })
  }

  if (role && userRole !== role) {
    throw createError({ statusCode: 403, statusMessage: `Requires ${role} role` })
  }

  event.context.user = {
    id:    supabaseUser.id,
    email: supabaseUser.email,
    role:  userRole
  }

  return event.context.user
}