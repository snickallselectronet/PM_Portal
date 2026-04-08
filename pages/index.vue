<template>
  <div class="min-h-screen bg-gray-50">
    <div class="container mx-auto px-4 py-8">
      <header class="mb-8 flex justify-between items-center">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 mb-2">Job Search</h1>
          <p class="text-gray-600">Search work orders from WO_POLE and Aurora systems</p>
        </div>
      </header>

      <!-- Debug Info -->
      <div class="mb-6 border-2 border-dashed border-green-500 rounded-lg p-3 bg-green-50">
        <p class="text-xs font-mono text-green-800 font-semibold mb-1">🛠 Debug Info</p>
        <div class="text-xs font-mono text-green-700 space-y-0.5">
          <div><span class="text-green-500">app:</span> nuxt-app</div>
          <div><span class="text-green-500">nuxt:</span> ^4.1.2 &nbsp;|&nbsp; <span class="text-green-500">vue:</span> 3.5.21</div>
          <div><span class="text-green-500">built:</span> {{ buildTime }}</div>
          <div><span class="text-green-500">filter:</span> {{ activeFilter }}</div>
        </div>
      </div>

      <!-- Work Order Lookup -->
      <div class="mb-6 bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900 mb-1">Work Order Lookup</h2>
        <p class="text-sm text-gray-500 mb-3">Enter a single work order number or paste multiple — from Excel or plain text, separated by commas, spaces, or new lines.</p>

        <textarea
          v-model="bulkInput"
          rows="4"
          placeholder="e.g. WO-1234&#10;WO-5678, WO-9012"
          class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
        />

        <div class="mt-3 flex flex-wrap gap-3 items-center">
          <button
            @click="runBulkLookup"
            :disabled="!bulkInput.trim() || bulkLookupLoading"
            class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {{ bulkLookupLoading ? 'Looking up…' : 'Look Up' }}
          </button>

          <button
            v-if="bulkFound.length > 0 && bulkFound.some(j => j.PROGRESS !== 'INPRG')"
            @click="bulkSetInProgress"
            :disabled="bulkUpdating"
            class="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {{ bulkUpdating
              ? `Updating… (${bulkUpdateProgress}/${bulkFound.filter(j => j.PROGRESS !== 'INPRG').length})`
              : bulkFound.filter(j => j.PROGRESS !== 'INPRG').length === 1
                ? 'Set to In Progress'
                : `Set All to In Progress (${bulkFound.filter(j => j.PROGRESS !== 'INPRG').length})`
            }}
          </button>

          <button
            v-if="bulkFound.length > 0 || bulkNotFound.length > 0"
            @click="clearBulkLookup"
            class="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            Clear
          </button>
        </div>

        <!-- Bulk update feedback -->
        <div v-if="bulkUpdateError" class="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {{ bulkUpdateError }}
        </div>
        <div v-if="bulkUpdateSuccess" class="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
          {{ bulkUpdateSuccess }}
        </div>

        <!-- Results -->
        <div v-if="bulkFound.length > 0 || bulkNotFound.length > 0" class="mt-4 space-y-4">

          <!-- Found -->
          <div v-if="bulkFound.length > 0">
            <h3 class="text-sm font-semibold text-gray-700 mb-2">
              ✅ {{ bulkFound.length === 1 ? 'Found' : `Found (${bulkFound.length})` }}
            </h3>
            <div class="overflow-x-auto rounded-lg border border-gray-200">
              <table class="min-w-full text-sm divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">WONUM</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-100">
                  <tr v-for="job in bulkFound" :key="`bulk-${job.source}-${job.OBJECTID}`" class="hover:bg-gray-50">
                    <td class="px-4 py-2 font-mono font-medium text-gray-900">{{ job.WONUM }}</td>
                    <td class="px-4 py-2">
                      <span
                        class="px-2 py-0.5 text-xs font-bold rounded-full"
                        :class="job.source === 'WO_POLE'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'"
                      >
                        {{ job.source === 'WO_POLE' ? 'WO_POLE' : 'Aurora' }}
                      </span>
                    </td>
                    <td class="px-4 py-2 text-gray-600 max-w-xs truncate">{{ job.JOB_DESCRIPTION || '—' }}</td>
                    <td class="px-4 py-2">
                      <span
                        class="px-2 py-0.5 text-xs font-semibold rounded-full"
                        :class="job.PROGRESS === 'INPRG'
                          ? 'bg-amber-100 text-amber-800'
                          : job.PROGRESS === 'COMP'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'"
                      >
                        {{ job.PROGRESS || '—' }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Not Found -->
          <div v-if="bulkNotFound.length > 0">
            <h3 class="text-sm font-semibold text-red-700 mb-2">
              ❌ {{ bulkNotFound.length === 1 ? 'Not Found' : `Not Found (${bulkNotFound.length})` }}
            </h3>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="wonum in bulkNotFound"
                :key="wonum"
                class="px-3 py-1 bg-red-50 border border-red-300 text-red-700 text-xs font-mono rounded-full"
              >
                {{ wonum }}
              </span>
            </div>
          </div>

        </div>
      </div>

      <!-- Search -->
      <SearchBar @search="handleSearch" />

      <!-- Loading / Error -->
      <div v-if="loading" class="text-center py-8">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p class="mt-2 text-gray-600">Loading jobs...</p>
      </div>

      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p class="text-red-800">{{ error }}</p>
      </div>

      <!-- Content -->
      <div v-else>
        <!-- Summary -->
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

        <!-- Cards -->
        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <JobCard
            v-for="job in jobs"
            :key="`${job.source}-${job.OBJECTID}`"
            :job="job"
            @job-updated="handleJobUpdated"
          />
        </div>

        <!-- Empty state -->
        <div v-if="jobs.length === 0 && !loading" class="text-center py-12">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <h3 class="mt-4 text-lg font-medium text-gray-900">No jobs found</h3>
          <p class="mt-2 text-gray-500">Try adjusting your search criteria</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const { public: pub } = useRuntimeConfig()

// Data/composable
const { jobs, allJobs, loading, error, searchJobs, filterJobs, updateJob } = useJobs()

// Filter state
const activeFilter = ref('all')

// Debug
const buildTime = ref('')

// ── Work order lookup state ────────────────────────────────────────
const bulkInput = ref('')
const bulkFound = ref([])
const bulkNotFound = ref([])
const bulkLookupLoading = ref(false)
const bulkUpdating = ref(false)
const bulkUpdateProgress = ref(0)
const bulkUpdateError = ref('')
const bulkUpdateSuccess = ref('')

/**
 * Parse the textarea into a clean deduplicated list of WO numbers.
 * Handles: newlines, tabs (Excel paste), commas, semicolons, spaces.
 */
function parseBulkInput(raw) {
  return [...new Set(
    raw
      .split(/[\n\r\t,;]+/)
      .flatMap(s => s.split(/\s+/))
      .map(s => s.trim().toUpperCase())
      .filter(Boolean)
  )]
}

async function runBulkLookup() {
  bulkFound.value = []
  bulkNotFound.value = []
  bulkUpdateError.value = ''
  bulkUpdateSuccess.value = ''
  bulkLookupLoading.value = true

  const requested = parseBulkInput(bulkInput.value)

  // Ensure allJobs is populated — trigger a full load if empty
  if (!Array.isArray(allJobs.value) || allJobs.value.length === 0) {
    await searchJobs('')
  }

  const jobMap = new Map(
    (allJobs.value || []).map(j => [String(j.WONUM || '').toUpperCase(), j])
  )

  const found = []
  const notFound = []

  for (const wonum of requested) {
    if (jobMap.has(wonum)) {
      found.push(jobMap.get(wonum))
    } else {
      notFound.push(wonum)
    }
  }

  bulkFound.value = found
  bulkNotFound.value = notFound
  bulkLookupLoading.value = false
}

async function bulkSetInProgress() {
  bulkUpdateError.value = ''
  bulkUpdateSuccess.value = ''
  bulkUpdating.value = true
  bulkUpdateProgress.value = 0

  const toUpdate = bulkFound.value.filter(j => j.PROGRESS !== 'INPRG')
  let successCount = 0
  const failed = []

  for (const job of toUpdate) {
    try {
      await $fetch(`${pub.apiBase}/jobs/${job.OBJECTID}`, {
        method: 'PATCH',
        body: { progress: 'INPRG', source: job.source }
      })
      job.PROGRESS = 'INPRG'
      updateJob({ ...job, PROGRESS: 'INPRG' })
      successCount++
    } catch (err) {
      failed.push(job.WONUM)
    }
    bulkUpdateProgress.value++
  }

  bulkUpdating.value = false

  if (failed.length === 0) {
    bulkUpdateSuccess.value = successCount === 1
      ? '✅ Successfully set 1 job to In Progress.'
      : `✅ Successfully set ${successCount} jobs to In Progress.`
  } else {
    bulkUpdateError.value = `⚠️ ${successCount} updated. Failed to update: ${failed.join(', ')}`
  }
}

function clearBulkLookup() {
  bulkInput.value = ''
  bulkFound.value = []
  bulkNotFound.value = []
  bulkUpdateError.value = ''
  bulkUpdateSuccess.value = ''
  bulkUpdateProgress.value = 0
}

// ── Search ─────────────────────────────────────────────────────────
let searchTimer = null
const debouncedSearch = (term) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    searchJobs(term)
  }, 300)
}

onMounted(() => {
  buildTime.value = new Date().toISOString()
  searchJobs()
})

const handleSearch = (searchTerm) => {
  activeFilter.value = 'all'
  debouncedSearch(searchTerm)
}

const handleSummaryClick = (filter) => {
  activeFilter.value = filter
  filterJobs(filter)
}

const handleJobUpdated = (updatedJob) => {
  updateJob(updatedJob)
}

// Counts
const allJobsCount = computed(() =>
  Array.isArray(allJobs?.value) ? allJobs.value.length : 0
)
const woPoleCount = computed(() =>
  Array.isArray(allJobs?.value) ? allJobs.value.filter(j => j.source === 'WO_POLE').length : 0
)
const auroraCount = computed(() =>
  Array.isArray(allJobs?.value) ? allJobs.value.filter(j => j.source === 'AURORA').length : 0
)
</script>