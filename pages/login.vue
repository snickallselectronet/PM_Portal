<!-- pages/login.vue -->
<template>
  <div class="min-h-screen bg-gray-50">
    <div class="container mx-auto px-4 py-8">
      <!-- Header (centered) -->
      <header class="mb-8 text-center">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Sign In</h1>
        <p class="text-gray-600">Access the PM Job Search portal</p>
      </header>

      <div class="max-w-md mx-auto">
        <!-- Error -->
        <div v-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p class="text-red-800">{{ error }}</p>
        </div>

        <!-- Card -->
        <div class="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <form @submit.prevent="submit" class="space-y-5">
            <div>
              <label for="username" class="block text-sm font-medium text-gray-700">Username</label>
              <input
                id="username"
                v-model="username"
                type="text"
                autocomplete="username"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="admin"
              />
            </div>

            <div>
              <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
              <div class="mt-1 relative">
                <input
                  :type="show ? 'text' : 'password'"
                  id="password"
                  v-model="password"
                  autocomplete="current-password"
                  class="block w-full rounded-md border-gray-300 shadow-sm pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  @click="show = !show"
                  class="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-gray-700 focus:outline-none"
                  aria-label="Toggle password visibility"
                >
                  <span v-if="show">Hide</span>
                  <span v-else>Show</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              :disabled="loading"
              class="w-full inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              <svg
                v-if="loading"
                class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none" viewBox="0 0 24 24"
              >
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
              </svg>
              {{ loading ? 'Signing in…' : 'Sign in' }}
            </button>
          </form>

          <!-- Optional: dev prefill button only -->
          <div v-if="demoPrefill" class="mt-6 text-right">
            <button @click="prefill" class="text-blue-600 hover:text-blue-800 hover:underline text-sm">
              Prefill from .env
            </button>
          </div>
        </div>

        <p class="text-xs text-gray-500 mt-4 text-center">
          Your session is stored in a secure, HTTP-only cookie.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({})

const username = ref('')
const password = ref('')
const show = ref(false)
const loading = ref(false)
const error = ref('')

const { public: pub } = useRuntimeConfig()
const demoPrefill = Boolean(pub?.demoLoginPrefill)

const prefill = () => {
  username.value = pub?.demoUser || ''
  password.value = pub?.demoPass || ''
}

const submit = async () => {
  error.value = ''
  loading.value = true
  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { username: username.value.trim(), password: password.value },
      credentials: 'include'
    })
    await navigateTo('/') // go home after successful login
  } catch (e) {
    error.value = e?.data?.statusMessage || e?.message || 'Login failed'
  } finally {
    loading.value = false
  }
}
</script>
