<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to Job Search
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          Access work orders from WO_POLE and Aurora systems
        </p>
      </div>
      
      <form class="mt-8 space-y-6" @submit.prevent="handleLogin">
        <div class="rounded-md shadow-sm space-y-4">
          <div>
            <label for="username" class="block text-sm font-medium text-gray-700">Username</label>
            <input
              id="username"
              v-model="credentials.username"
              name="username"
              type="text"
              required
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Enter username"
            />
          </div>
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
            <input
              id="password"
              v-model="credentials.password"
              name="password"
              type="password"
              required
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Enter password"
            />
          </div>
        </div>

        <div v-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4">
          <p class="text-red-800 text-sm">{{ error }}</p>
        </div>

        <div>
          <button
            type="submit"
            :disabled="loading"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="loading" class="absolute left-0 inset-y-0 flex items-center pl-3">
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            </span>
            {{ loading ? 'Signing in...' : 'Sign in' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  layout: false
})

const credentials = ref({
  username: '',
  password: ''
})

const loading = ref(false)
const error = ref('')

const handleLogin = async () => {
  console.log('=== FRONTEND LOGIN START ===')
  console.log('Credentials:', credentials.value)
  
  loading.value = true
  error.value = ''

  try {
    console.log('Making fetch request to /api/auth/login')
    
    const response = await $fetch('/api/auth/login', {
      method: 'POST',
      body: credentials.value
    })

    console.log('Response received:', response)
    console.log('Response success:', response.success)

    if (response && response.success) {
      console.log('Login successful, setting client cookie...')
      
      // Manually set the cookie on the client side to ensure it's available immediately
      const authCookie = useCookie('auth-token')
      authCookie.value = 'authenticated'
      
      console.log('Cookie set, waiting before redirect...')
      
      // Small delay to ensure cookie is properly set
      await new Promise(resolve => setTimeout(resolve, 100))
      
      console.log('Redirecting to home page...')
      window.location.href = '/'
    } else {
      console.log('Login failed - no success in response')
      error.value = 'Login failed'
    }
  } catch (err) {
    console.error('=== LOGIN ERROR ===')
    console.error('Error object:', err)
    console.error('Error message:', err.message)
    console.error('Error data:', err.data)
    console.error('Error status:', err.status)
    
    error.value = err.data?.message || err.message || 'Login failed - please try again'
  } finally {
    loading.value = false
    console.log('=== FRONTEND LOGIN END ===')
  }
}
</script>