<template>
  <div class="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
    <div class="flex justify-between items-start mb-4">
      <div>
        <h3 class="text-lg font-semibold text-gray-900">{{ job.WONUM }}</h3>
        <p v-if="job.PARENTWONUM" class="text-sm text-gray-600">Parent: {{ job.PARENTWONUM }}</p>
      </div>
      <span class="px-3 py-1 text-sm font-bold rounded-full" :class="sourceClass">
        {{ sourceLabel }}
      </span>
    </div>

    <div class="space-y-2">
      <div v-if="job.JOB_DESCRIPTION">
        <label class="text-sm font-medium text-gray-700">Job Description:</label>
        <p class="text-sm text-gray-900">{{ job.JOB_DESCRIPTION }}</p>
      </div>

      <div v-if="job.LONG_DESCRIPTION">
        <label class="text-sm font-medium text-gray-700">Details:</label>
        <p class="text-sm text-gray-900">{{ job.LONG_DESCRIPTION }}</p>
      </div>

      <div class="grid grid-cols-2 gap-4 mt-4 text-sm">
        <div>
          <label class="font-medium text-gray-700">Progress:</label>
          <select
            v-model="localProgress"
            @change="updateProgress"
            :disabled="updating"
            class="mt-1 block w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          >
            <option value="INPRG">In Progress</option>
            <option value="COMP">Complete</option>
          </select>
          <div v-if="updating" class="text-xs text-blue-600 mt-1">Updating...</div>
          <div v-if="updateError" class="text-xs text-red-600 mt-1">{{ updateError }}</div>
        </div>

        <div v-if="job.ASSET_CLASS_LIST">
          <label class="font-medium text-gray-700">Asset Class:</label>
          <p class="text-gray-900">{{ job.ASSET_CLASS_LIST }}</p>
        </div>

        <div v-if="job.MAIN_ASSETNUM">
          <label class="font-medium text-gray-700">Main Asset:</label>
          <p class="text-gray-900">{{ job.MAIN_ASSETNUM }}</p>
        </div>

        <div v-if="job.COMM_DATE">
          <label class="font-medium text-gray-700">Comm Date:</label>
          <p class="text-gray-900">{{ formatDate(job.COMM_DATE) }}</p>
        </div>
      </div>

      <div v-if="job.COMMENTS" class="mt-3 pt-3 border-t border-gray-200">
        <label class="text-sm font-medium text-gray-700">Comments:</label>
        <p class="text-sm text-gray-900">{{ job.COMMENTS }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  job: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['jobUpdated'])

const localProgress = ref(props.job.PROGRESS || 'INPRG')
const updating = ref(false)
const updateError = ref('')

// Watch for changes to the job prop and update localProgress accordingly
watch(() => props.job.PROGRESS, (newProgress) => {
  localProgress.value = newProgress || 'INPRG'
}, { immediate: true })

const sourceClass = computed(() => {
  return props.job.source === 'WO_POLE' 
    ? 'bg-blue-100 text-blue-800 border border-blue-200' 
    : 'bg-green-100 text-green-800 border border-green-200'
})

const sourceLabel = computed(() => {
  return props.job.source === 'WO_POLE' 
    ? 'WO_POLE' 
    : 'AuroraTXFRandCable'
})

const formatDate = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleDateString()
}

const updateProgress = async () => {
  const originalProgress = props.job.PROGRESS
  
  console.log('=== FRONTEND UPDATE DEBUG ===')
  console.log('Job:', props.job.WONUM)
  console.log('Source:', props.job.source)
  console.log('OBJECTID:', props.job.OBJECTID)
  console.log('Original Progress:', originalProgress)
  console.log('New Progress:', localProgress.value)
  
  if (localProgress.value === originalProgress) {
    console.log('No change detected, skipping update')
    return // No change
  }

  updating.value = true
  updateError.value = ''

  const requestBody = {
    progress: localProgress.value,
    source: props.job.source
  }
  
  console.log('Request body:', JSON.stringify(requestBody, null, 2))
  console.log('API URL:', `/api/jobs/${props.job.OBJECTID}`)

  try {
    console.log('Sending PATCH request...')
    const response = await $fetch(`/api/jobs/${props.job.OBJECTID}`, {
      method: 'PATCH',
      body: requestBody
    })

    console.log('✅ API Response:', response)

    // Emit the updated job data to parent
    emit('jobUpdated', {
      ...props.job,
      PROGRESS: localProgress.value
    })

    console.log(`✅ Job ${props.job.WONUM} progress updated to ${localProgress.value}`)

  } catch (error) {
    console.error('❌ Error updating progress:', error)
    console.error('Error details:', {
      status: error.status,
      statusCode: error.statusCode,
      statusText: error.statusText,
      message: error.message,
      data: error.data
    })
    
    updateError.value = `Failed to update progress: ${error.statusText || error.message}`
    // Revert the local value to original
    localProgress.value = originalProgress
  } finally {
    updating.value = false
  }
}
</script>