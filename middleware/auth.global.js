export default defineNuxtRouteMiddleware((to) => {
  // Skip auth check for login page and API routes
  if (to.path === '/login' || to.path.startsWith('/api/')) {
    return
  }

  // Only run on client side to avoid SSR issues
  if (process.client) {
    // Add a small delay to allow cookie to be set
    const authCookie = useCookie('auth-token', {
      default: () => null
    })
    
    console.log('Auth middleware - checking cookie:', authCookie.value)
    console.log('Current path:', to.path)
    
    // Check document.cookie as backup since useCookie might not update immediately
    const cookieValue = document.cookie
      .split('; ')
      .find(row => row.startsWith('auth-token='))
      ?.split('=')[1]
    
    console.log('Direct cookie check:', cookieValue)
    
    if (!authCookie.value && !cookieValue) {
      console.log('No auth found, redirecting to login')
      return navigateTo('/login')
    }
    
    console.log('Auth found, allowing access')
  }
})