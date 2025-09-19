<template>
  <div class="min-h-screen bg-gray-50">
    <div class="container mx-auto px-4 py-8">
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

const activeFilter = ref('all')

const handleSearch = (searchTerm) => {
  activeFilter.value = 'all' // Reset filter when searching
  searchJobs(searchTerm)
}

const handleSummaryClick = (filter) => {
  console.log('Filter clicked:', filter) // Debug log
  activeFilter.value = filter
  filterJobs(filter)
}

const handleJobUpdated = (updatedJob) => {
  console.log('Job updated:', updatedJob.WONUM, 'Progress:', updatedJob.PROGRESS)
}

// Computed properties with better defensive checks
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

const handleLogout = async () => {
  console.log('=== LOGOUT CLICKED ===')
  try {
    console.log('Calling logout API...')
    await $fetch('/api/logout', {
      method: 'POST'
    })
    console.log('Logout API successful')
    
    // Clear the client-side cookie manually
    const authCookie = useCookie('auth-token')
    authCookie.value = null
    console.log('Cleared client cookie')
    
    // Also clear via document.cookie as backup
    document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    console.log('Cleared document cookie')
    
    console.log('Redirecting to login...')
    window.location.href = '/login'
  } catch (error) {
    console.error('Logout error:', error)
    // Force navigation even if logout fails
    const authCookie = useCookie('auth-token')
    authCookie.value = null
    window.location.href = '/login'
  }
}

// Load all jobs on mount
onMounted(() => {
  searchJobs()
})
</script>