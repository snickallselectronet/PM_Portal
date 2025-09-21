<template>
  <div class="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
    <div class="flex justify-between items-start mb-4">
      <div>
        <h3 class="text-lg font-semibold text-gray-900">{{ job.WONUM || '—' }}</h3>
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
        <p class="text-sm text-gray-900 whitespace-pre-line">{{ job.LONG_DESCRIPTION }}</p>
      </div>

      <div class="grid grid-cols-2 gap-4 mt-4 text-sm">
        <div>
          <label class="font-medium text-gray-700">Progress:</label>
          <select
            v-model="localProgress"
            @change="updateProgress"
            :disabled="updating || !isUpdatable"
            class="mt-1 block w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            aria-label="Update job progress"
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
        <p class="text-sm text-gray-900 whitespace-pre-line">{{ job.COMMENTS }}</p>
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

// IMPORTANT: matches parent listener @job-updated
const emit = defineEmits(['job-updated'])

const { public: pub } = useRuntimeConfig()

const localProgress = ref(props.job?.PROGRESS || 'INPRG')
const updating = ref(false)
const updateError = ref('')

// Reflect prop changes into local state
watch(
  () => props.job?.PROGRESS,
  (newVal) => { localProgress.value = newVal || 'INPRG' },
  { immediate: true }
)

const isUpdatable = computed(() => {
  // Must have numeric OBJECTID and valid source (WO_POLE | AURORA)
  const hasId = Number.isFinite(Number(props.job?.OBJECTID))
  const validSource = ['WO_POLE', 'AURORA'].includes(String(props.job?.source || '').toUpperCase())
  return hasId && validSource
})

const sourceClass = computed(() =>
  (props.job?.source === 'WO_POLE')
    ? 'bg-blue-100 text-blue-800 border border-blue-200'
    : 'bg-green-100 text-green-800 border border-green-200'
)

const sourceLabel = computed(() =>
  (props.job?.source === 'WO_POLE') ? 'WO_POLE' : 'AuroraTXFRandCable'
)

function formatDate(input) {
  if (!input) return ''
  // ArcGIS often returns epoch ms; may also be ISO
  const ts = Number(input)
  const date = Number.isFinite(ts) ? new Date(ts) : new Date(String(input))
  return isNaN(date.getTime()) ? '' : date.toLocaleDateString()
}

async function updateProgress() {
  // Basic no-op guard
  const original = props.job?.PROGRESS
  const next = localProgress.value

  if (next === original) return
  if (!isUpdatable.value) {
    updateError.value = 'Job is not updatable (missing OBJECTID or source)'
    localProgress.value = original || 'INPRG'
    return
  }

  updating.value = true
  updateError.value = ''

  const objectId = Number(props.job.OBJECTID)
  const body = {
    progress: String(next || '').toUpperCase(),
    source: String(props.job.source || '').toUpperCase()
  }

  try {
    const res = await $fetch(`${pub.apiBase}/jobs/${objectId}`, {
      method: 'PATCH',
      body
    })

    // optimistic succeeded — tell parent to sync stores
    emit('job-updated', {
      ...props.job,
      PROGRESS: body.progress
    })
  } catch (err) {
    // Try to surface a meaningful message
    const msg =
      err?.data?.statusMessage ||
      err?.statusMessage ||
      err?.message ||
      'Failed to update progress'
    updateError.value = msg
    // revert UI
    localProgress.value = original || 'INPRG'
    console.error('Update progress error:', err)
  } finally {
    updating.value = false
  }
}
</script>
