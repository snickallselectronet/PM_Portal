// composables/useApi.js
// Wraps $fetch to automatically attach the Supabase access token as a Bearer header.
// Use this instead of $fetch for all authenticated API calls.

export function useApi() {
  const supabase = useSupabase()

  async function apiFetch(url, options = {}) {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.access_token) {
      await navigateTo('/login')
      throw new Error('No active session')
    }

    return $fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${session.access_token}`
      }
    })
  }

  return { apiFetch }
}