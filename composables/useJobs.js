export const useJobs = () => {
  const jobs = ref([])
  const allJobs = ref([]) // Store all jobs for filtering
  const loading = ref(false)
  const error = ref(null)
  const currentFilter = ref('all')

  const searchJobs = async (searchTerm = '') => {
    loading.value = true
    error.value = null

    try {
      const response = await $fetch('/api/jobs', {
        params: { search: searchTerm }
      })

      allJobs.value = response.jobs
      applyFilter(currentFilter.value)
    } catch (err) {
      error.value = 'Failed to fetch jobs'
      console.error('Error fetching jobs:', err)
    } finally {
      loading.value = false
    }
  }

  const filterJobs = (sourceFilter) => {
    currentFilter.value = sourceFilter
    applyFilter(sourceFilter)
  }

  const applyFilter = (sourceFilter) => {
    if (sourceFilter === 'all') {
      jobs.value = [...allJobs.value] // Create new array reference
    } else {
      jobs.value = allJobs.value.filter(job => job.source === sourceFilter)
    }
  }

  // Add function to update a job in the store
  const updateJob = (updatedJob) => {
    // Update in allJobs
    const allJobsIndex = allJobs.value.findIndex(job => 
      job.OBJECTID === updatedJob.OBJECTID && job.source === updatedJob.source
    )
    if (allJobsIndex !== -1) {
      allJobs.value[allJobsIndex] = { ...allJobs.value[allJobsIndex], ...updatedJob }
    }

    // Update in filtered jobs
    const jobsIndex = jobs.value.findIndex(job => 
      job.OBJECTID === updatedJob.OBJECTID && job.source === updatedJob.source
    )
    if (jobsIndex !== -1) {
      jobs.value[jobsIndex] = { ...jobs.value[jobsIndex], ...updatedJob }
    }
  }

  return {
    jobs, // Remove readonly()
    allJobs, // Remove readonly()
    loading,
    error,
    searchJobs,
    filterJobs,
    updateJob // Add the update function
  }
}