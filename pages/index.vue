<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Login Modal -->
    <div v-if="!isAuthenticated" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <div class="text-center">
            <h3 class="text-lg font-bold text-gray-900 mb-2">Sign in to Job Search</h3>
            <p class="text-sm text-gray-600 mb-6">Access work orders from WO_POLE and Aurora systems</p>
          </div>
          
          <form @submit.prevent="handleLogin" class="space-y-4">
            <div>
              <label for="username" class="block text-sm font-medium text-gray-700">Username</label>
              <input
                id="username"
                v-model="credentials.username"
                type="text"
                required
                class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter username"
              />
            </div>
            
            <div>
              <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
              <input
                id="password"
                v-model="credentials.password"
                type="password"
                required
                class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter password"
              />
            </div>

            <div v-if="loginError" class="bg-red-50 border border-red-200 rounded-lg p-3">
              <p class="text-red-800 text-sm">{{ loginError }}</p>
            </div>

            <button
              type="submit"
              :disabled="loggingIn"
              class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {{ loggingIn ? 'Signing in...' : 'Sign in' }}
            </button>
          </form>
        </div>
      </div>
    </div>

    <!-- Main App Content (hidden when not authenticated) -->
    <div v-if="isAuthenticated" class="container mx-auto px-4 py-8">
      <header class="mb-8 flex justify-between items-center">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 mb-2">Job Search</h1>
          <p class="text-gray-600">Search work orders from WO_POLE and Aurora systems</p>
        </div>
        <button
          @click="handleLogout"
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Logout
        </button>
      </header>

      <SearchBar @search="handleSearch" />

      <div v-if="loading" class="text-center py-8">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p class="mt-2 text-gray-600">Loading jobs...</p>
      </div>

      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p class="text-red-800">{{ error }}</p>
      </div>

      <div v-else>
        <div class="mb-6 bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <h2 class="text-lg font-semibold text-gray-900 mb-3">Job Summary</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              @click="handleSummaryClick('all')"
              :class="[
                'text-center p-3 rounded-lg transition-all duration-200 hover:shadow-md cursor-pointer',
                activeFilter === 'all' ? 'bg-gray-200 ring-2 ring-gray-400' : 'bg-gray-50 hover:bg-gray-100'
              ]"
            >
              <div class="text-2xl font-bold text-gray-900">{{ allJobsCount }}</div>
              <div class="text-sm text-gray-600">Total Jobs</div>
            </button>
            <button
              @click="handleSummaryClick('WO_POLE')"
              :class="[
                'text-center p-3 rounded-lg transition-all duration-200 hover:shadow-md cursor-pointer',
                activeFilter === 'WO_POLE' ? 'bg-blue-200 ring-2 ring-blue-400' : 'bg-blue-50 hover:bg-blue-100'
              ]"
            >
              <div class="text-2xl font-bold text-blue-600">{{ woPoleCount }}</div>
              <div class="text-sm text-blue-800">WO_POLE</div>
            </button>
            <button
              @click="handleSummaryClick('AURORA')"
              :class="[
                'text-center p-3 rounded-lg transition-all duration-200 hover:shadow-md cursor-pointer',
                activeFilter === 'AURORA' ? 'bg-green-200 ring-2 ring-green-400' : 'bg-green-50 hover:bg-green-100'
              ]"
            >
              <div class="text-2xl font-bold text-green-600">{{ auroraCount }}</div>
              <div class="text-sm text-green-800">AuroraTXFRandCable</div>
            </button>
          </div>
        </div>

        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <JobCard
            v-for="job in jobs"
            :key="`${job.source}-${job.OBJECTID}`"
            :job="job"
            @job-updated="handleJobUpdated"
          />
        </div>

        <div v-if="jobs.length === 0 && !loading" class="text-center py-12">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <h3 class="mt-4 text-lg font-medium text-gray-900">No jobs found</h3>
          <p class="mt-2 text-gray-500">Try adjusting your search criteria</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const { jobs, allJobs, loading, error, searchJobs, filterJobs, updateJob } = useJobs()

// Authentication state
const isAuthenticated = ref(false)
const credentials = ref({ username: '', password: '' })
const loginError = ref('')
const loggingIn = ref(false)

// Job search state
const activeFilter = ref('all')

// Check for existing authentication on page load
onMounted(() => {
  const authStatus = localStorage.getItem('job-search-auth')
  if (authStatus === 'authenticated') {
    isAuthenticated.value = true
    searchJobs()
  }
})

const handleLogin = async () => {
  loggingIn.value = true
  loginError.value = ''

  // Get credentials from runtime config (these are set from .env)
  const config = useRuntimeConfig()
  
  console.log('=== LOGIN DEBUG ===')
  console.log('Entered username:', credentials.value.username)
  console.log('Entered password:', credentials.value.password)
  console.log('Expected username:', config.public.loginUsername)
  console.log('Expected password:', config.public.loginPassword)
  console.log('Config public:', config.public)
  
  // Simple client-side validation against environment variables
  if (credentials.value.username === config.public.loginUsername && 
      credentials.value.password === config.public.loginPassword) {
    
    console.log('✅ Credentials match!')
    // Set authentication
    isAuthenticated.value = true
    localStorage.setItem('job-search-auth', 'authenticated')
    
    // Clear credentials
    credentials.value = { username: '', password: '' }
    
    // Load jobs
    await searchJobs()
  } else {
    console.log('❌ Credentials do not match')
    loginError.value = 'Invalid username or password'
  }
  
  loggingIn.value = false
}

const handleLogout = () => {
  isAuthenticated.value = false
  localStorage.removeItem('job-search-auth')
  credentials.value = { username: '', password: '' }
}

const handleSearch = (searchTerm) => {
  activeFilter.value = 'all'
  searchJobs(searchTerm)
}

const handleSummaryClick = (filter) => {
  activeFilter.value = filter
  filterJobs(filter)
}

const handleJobUpdated = (updatedJob) => {
  updateJob(updatedJob)
}

// Computed properties for counts
const allJobsCount = computed(() => {
  if (!allJobs || !allJobs.value) return 0
  return Array.isArray(allJobs.value) ? allJobs.value.length : 0
})

const woPoleCount = computed(() => {
  if (!allJobs || !allJobs.value || !Array.isArray(allJobs.value)) return 0
  return allJobs.value.filter(job => job.source === 'WO_POLE').length
})

const auroraCount = computed(() => {
  if (!allJobs || !allJobs.value || !Array.isArray(allJobs.value)) return 0
  return allJobs.value.filter(job => job.source === 'AURORA').length
})
</script>