// composables/useAuth.js
// Provides current user session, role, and auth helpers across the app

export const useAuth = () => {
  const supabase = useSupabase()
  const user     = useState('auth:user', () => null)
  const role     = useState('auth:role', () => null)
  const loading  = useState('auth:loading', () => true)

  const isAdmin = computed(() => role.value === 'ADMIN')
  const isPM    = computed(() => role.value === 'PM' || role.value === 'ADMIN')

  async function loadSession() {
    loading.value = true
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        user.value  = null
        role.value  = null
        return
      }

      user.value = session.user

      // Fetch role from user_profiles
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      role.value = profile?.role || null
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    await supabase.auth.signOut()
    user.value = null
    role.value = null
    await navigateTo('/login')
  }

  return { user, role, isAdmin, isPM, loading, loadSession, logout }
}