<!-- pages/login.vue -->
<template>
  <div class="min-h-screen bg-gray-50">
    <div class="container mx-auto px-4 py-8">

      <header class="mb-8 text-center">
        <div class="flex items-center justify-center gap-2 mb-4">
          <div class="w-2 h-2 rounded-full bg-green-500"></div>
          <span class="text-xs font-medium text-gray-500 tracking-widest uppercase">ElectroNet</span>
        </div>
        <h1 class="text-3xl font-bold text-gray-900 mb-2">PM Portal</h1>
        <p class="text-gray-600">Field work management — sign in to continue</p>
      </header>

      <div class="max-w-md mx-auto">

        <div v-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p class="text-red-800 text-sm">{{ error }}</p>
        </div>

        <div class="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div class="space-y-5">

            <div>
              <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
              <input
                id="email"
                v-model="email"
                type="email"
                autocomplete="email"
                @keydown.enter="submit"
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="you@electronet.co.nz"
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
                  @keydown.enter="submit"
                  class="block w-full rounded-md border border-gray-300 px-3 py-2 pr-16 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  @click="show = !show"
                  class="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-gray-700 text-sm focus:outline-none"
                >
                  {{ show ? 'Hide' : 'Show' }}
                </button>
              </div>
            </div>

            <button
              @click="submit"
              :disabled="loading || !email || !password"
              class="w-full inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg v-if="loading"
                class="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
              </svg>
              {{ loading ? 'Signing in…' : 'Sign in' }}
            </button>

          </div>
        </div>

        <p class="text-xs text-gray-400 mt-4 text-center">Internal use only — ElectroNet staff only</p>
      </div>
    </div>
  </div>
</template>

<script setup>
const supabase = useSupabase()
const route    = useRoute()

const email    = ref('')
const password = ref('')
const show     = ref(false)
const loading  = ref(false)
const error    = ref('')

async function submit() {
  if (!email.value || !password.value) return
  error.value   = ''
  loading.value = true

  try {
    const { error: authError } = await supabase.auth.signInWithPassword({
      email:    email.value.trim(),
      password: password.value
    })

    if (authError) {
      error.value = authError.message
      return
    }

    // Load role into global auth state
    const { loadSession } = useAuth()
    await loadSession()

    await navigateTo('/')

  } catch (e) {
    error.value = e?.message || 'Sign in failed'
  } finally {
    loading.value = false
  }
}
</script>