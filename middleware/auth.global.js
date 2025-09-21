export default defineNuxtRouteMiddleware(async (to) => {
  // Public page
  if (to.path === '/login') return

  try {
    await $fetch('/api/auth/me', { credentials: 'include' })
  } catch {
    return navigateTo('/login')
  }
})
