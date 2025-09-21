// composables/useJobs.js
export const useJobs = () => {
  const jobs = ref([])
  const allJobs = ref([])
  const loading = ref(false)
  const error = ref(null)
  const currentFilter = ref('all')

  // abort controller to cancel previous search
  let abortCtrl = null

  const searchJobs = async (searchTerm = '') => {
    // cancel prior in-flight request
    if (abortCtrl) {
      try { abortCtrl.abort() } catch {}
    }
    abortCtrl = new AbortController()

    loading.value = true
    error.value = null

    try {
      const { public: pub } = useRuntimeConfig()

      const res = await $fetch(`${pub.apiBase}/jobs`, {
        method: 'GET',
        query: { search: String(searchTerm || '') },
        signal: abortCtrl.signal
      })

      // Defensive: ensure expected shape
      const list = Array.isArray(res?.jobs) ? res.jobs : []
      allJobs.value = [...list] // new reference for reactivity
      applyFilter(currentFilter.value)
    } catch (err) {
      if (err?.name === 'AbortError') {
        // Silently ignore aborted requests
        return
      }
      // Normalize error for UI
      const status = err?.status || err?.response?.status
      const msg =
        err?.data?.statusMessage ||
        err?.statusMessage ||
        err?.message ||
        (status ? `Request failed (${status})` : 'Failed to fetch jobs')
      error.value = msg
      console.error('Error fetching jobs:', err)
      // Clear on hard errors if you prefer:
      // allJobs.value = []; jobs.value = []
    } finally {
      loading.value = false
    }
  }

  const filterJobs = (sourceFilter) => {
    currentFilter.value = sourceFilter || 'all'
    applyFilter(currentFilter.value)
  }

  const applyFilter = (sourceFilter) => {
    if (!Array.isArray(allJobs.value)) {
      jobs.value = []
      return
    }
    if (sourceFilter === 'all') {
      jobs.value = [...allJobs.value]
    } else {
      jobs.value = allJobs.value.filter(j => j?.source === sourceFilter)
    }
  }

  // Update a job instance already in memory
  const updateJob = (updatedJob) => {
    if (!updatedJob) return

    const match = (job) =>
      job?.OBJECTID === updatedJob?.OBJECTID && job?.source === updatedJob?.source

    // Update in allJobs
    if (Array.isArray(allJobs.value)) {
      const i = allJobs.value.findIndex(match)
      if (i !== -1) {
        allJobs.value[i] = { ...allJobs.value[i], ...updatedJob }
        // ensure reactivity in Vue 3 reactivity caveats
        allJobs.value = [...allJobs.value]
      }
    }

    // Update in current filtered list
    if (Array.isArray(jobs.value)) {
      const j = jobs.value.findIndex(match)
      if (j !== -1) {
        jobs.value[j] = { ...jobs.value[j], ...updatedJob }
        jobs.value = [...jobs.value]
      }
    }
  }

  // Optional: convenience to fully reset state
  const resetJobs = () => {
    jobs.value = []
    allJobs.value = []
    currentFilter.value = 'all'
    error.value = null
  }

  return {
    jobs,
    allJobs,
    loading,
    error,
    currentFilter,
    searchJobs,
    filterJobs,
    updateJob,
    resetJobs
  }
}
