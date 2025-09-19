export default defineEventHandler(async (event) => {
  console.log('=== LOGOUT API CALLED ===')
  
  // Clear the auth cookie
  console.log('Clearing auth cookie...')
  setCookie(event, 'auth-token', '', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0 // Expire immediately
  })
  
  console.log('Logout successful!')
  return {
    success: true,
    message: 'Logged out successfully'
  }
})