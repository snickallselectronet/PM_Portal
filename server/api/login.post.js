export default defineEventHandler(async (event) => {
  console.log('=== LOGIN API CALLED ===')
  console.log('Method:', event.node.req.method)
  console.log('URL:', event.node.req.url)
  
  const body = await readBody(event)
  console.log('Request body:', body)
  
  const config = useRuntimeConfig()
  console.log('Config username:', config.loginUsername)
  console.log('Config password exists:', !!config.loginPassword)
  
  if (!body.username || !body.password) {
    console.log('Missing username or password')
    throw createError({
      statusCode: 400,
      statusMessage: 'Username and password are required'
    })  
  }
  
  // Check credentials against .env values
  const isValid = body.username === config.loginUsername && 
                  body.password === config.loginPassword
  
  console.log('Credentials check:', {
    providedUsername: body.username,
    expectedUsername: config.loginUsername,
    passwordMatch: body.password === config.loginPassword,
    isValid
  })
  
  if (!isValid) {
    console.log('Invalid credentials')
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid credentials'
    })
  }
  
  console.log('Setting auth cookie...')
  // Set session cookie
  setCookie(event, 'auth-token', 'authenticated', {
    httpOnly: false, // Change to false so client can read it
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7 // 7 days
  })
  
  console.log('Login successful!')
  return {
    success: true,
    authToken: 'authenticated', // Return the token value
    user: {
      username: body.username
    }
  }
})