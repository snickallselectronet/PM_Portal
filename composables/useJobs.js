// composables/useJobs.js
export const useJobs = () => {
  const jobs = ref([])
  const allJobs = ref([])
  const loading = ref(false)
  const error = ref(null)
  const currentFilter = ref('all')

  let abortCtrl = null

  const searchJobs = async (searchTerm = '') => {
    if (abortCtrl) { try { abortCtrl.abort() } catch {} }
    abortCtrl = new AbortController()

    loading.value = true
    error.value = null

    try {
      const { public: pub } = useRuntimeConfig()
      // Ensure pub.apiBase is '/api' (or set BASE = '/api' directly)
      const BASE = `${pub.apiBase || '/api'}/jobs`

      const res = await $fetch(BASE, {
        method: 'GET',
        // Send both keys so we’re compatible with either server impl
        query: { q: String(searchTerm || ''), search: String(searchTerm || '') },
        signal: abortCtrl.signal
      })

      // Accept either an array or { jobs: [...] }
      const list = Array.isArray(res) ? res : (Array.isArray(res?.jobs) ? res.jobs : [])
      allJobs.value = [...list]
      applyFilter(currentFilter.value)
    } catch (err) {
      if (err?.name === 'AbortError') return
      const status = err?.status || err?.response?.status
      const msg =
        err?.data?.statusMessage ||
        err?.statusMessage ||
        err?.message ||
        (status ? `Request failed (${status})` : 'Failed to fetch jobs')
      error.value = msg
      console.error('Error fetching jobs:', err)
    } finally {
      loading.value = false
    }
  }

  const filterJobs = (sourceFilter) => {
    currentFilter.value = sourceFilter || 'all'
    applyFilter(currentFilter.value)
  }

  const applyFilter = (sourceFilter) => {
    if (!Array.isArray(allJobs.value)) { jobs.value = []; return }
    jobs.value = sourceFilter === 'all'
      ? [...allJobs.value]
      : allJobs.value.filter(j => j?.source === sourceFilter)
  }

  const updateJob = (updatedJob) => {
    if (!updatedJob) return
    const match = (job) =>
      job?.OBJECTID === updatedJob?.OBJECTID && job?.source === updatedJob?.source

    if (Array.isArray(allJobs.value)) {
      const i = allJobs.value.findIndex(match)
      if (i !== -1) { allJobs.value[i] = { ...allJobs.value[i], ...updatedJob }; allJobs.value = [...allJobs.value] }
    }
    if (Array.isArray(jobs.value)) {
      const j = jobs.value.findIndex(match)
      if (j !== -1) { jobs.value[j] = { ...jobs.value[j], ...updatedJob }; jobs.value = [...jobs.value] }
    }
  }

  const resetJobs = () => {
    jobs.value = []
    allJobs.value = []
    currentFilter.value = 'all'
    error.value = null
  }

  return { jobs, allJobs, loading, error, currentFilter, searchJobs, filterJobs, updateJob, resetJobs }
}
