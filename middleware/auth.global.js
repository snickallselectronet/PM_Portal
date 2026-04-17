// middleware/auth.global.js
export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login') return

  // Skip middleware on server side — session lives in browser localStorage
  if (import.meta.server) return

  const supabase = useSupabase()
  const { role, loadSession } = useAuth()

  // Get session from Supabase (reads from localStorage in browser)
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }

  // Load role if not in state yet
  if (!role.value) {
    await loadSession()
  }

  // Admin-only pages
  const adminRoutes = ['/config', '/logs', '/fieldlogs']
  if (adminRoutes.includes(to.path) && role.value !== 'ADMIN') {
    return navigateTo('/')
  }
})