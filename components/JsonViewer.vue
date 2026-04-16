<!-- components/JsonViewer.vue -->
<!-- Viewer modal: version selector, syntax-highlighted display, Edit + Delete buttons -->
<template>
  <Teleport to="body">
    <div v-if="modelValue"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      @click.self="$emit('update:modelValue', false)"
    >
      <div class="absolute inset-0 bg-black/50" @click="$emit('update:modelValue', false)"/>

      <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">

        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 class="text-lg font-semibold text-gray-900 font-mono">WO {{ woNum }} — JSON Viewer</h2>
            <p class="text-xs text-gray-500 mt-0.5">Select a version to view</p>
          </div>
          <div class="flex items-center gap-3">
            <button @click="copyJson"
              class="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-1.5">
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
              </svg>
              {{ copied ? 'Copied!' : 'Copy' }}
            </button>
            <button @click="$emit('update:modelValue', false)"
              class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Version selector bar -->
        <div class="flex items-center gap-3 px-6 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <label class="text-xs font-medium text-gray-600 whitespace-nowrap">Version:</label>
          <select v-model="selectedVersionIndex"
            class="flex-1 text-xs border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option :value="-1">Current (latest saved)</option>
            <option v-for="(rev, idx) in revisions" :key="rev.id" :value="idx">
              {{ formatDate(rev.changed_at) }} — {{ rev.changed_by }}{{ rev.note ? ` — ${rev.note}` : '' }}
            </option>
          </select>

          <!-- Actions for selected version -->
          <button
            @click="$emit('edit', { selected: currentJson, current: currentData })"
            class="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
            Edit
          </button>
          <button
            v-if="selectedVersionIndex >= 0"
            @click="confirmDelete"
            :disabled="deleting"
            class="px-3 py-1.5 text-xs font-medium bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
          >
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
            {{ deleting ? 'Deleting…' : 'Delete Version' }}
          </button>
        </div>

        <!-- Delete confirm bar -->
        <div v-if="showDeleteConfirm"
          class="flex items-center gap-3 px-6 py-3 bg-red-50 border-b border-red-200 flex-shrink-0">
          <p class="text-xs text-red-700 flex-1">Are you sure? This revision will be permanently deleted.</p>
          <button @click="deleteRevision"
            class="px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
            Yes, delete
          </button>
          <button @click="showDeleteConfirm = false"
            class="px-3 py-1.5 text-xs font-medium bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg transition-colors">
            Cancel
          </button>
        </div>

        <!-- JSON display -->
        <div class="flex-1 overflow-auto bg-gray-950 rounded-b-xl">
          <div v-if="loading" class="flex items-center justify-center py-16">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"/>
          </div>
          <div v-else-if="error" class="p-6 text-red-400 text-sm">{{ error }}</div>
          <pre v-else class="hljs language-json p-6 text-sm leading-5 rounded-b-xl" v-html="highlighted"/>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Boolean, required: true },
  woNum:      { type: String,  required: true },
})

const emit = defineEmits(['update:modelValue', 'edit', 'saved', 'revisionsUpdated'])

const { apiFetch } = useApi()

const loading   = ref(false)
const error     = ref('')
const copied    = ref(false)
const deleting  = ref(false)
const showDeleteConfirm = ref(false)

// Data
const currentData        = ref(null)   // latest processed_data
const revisions          = ref([])
const selectedVersionIndex = ref(-1)   // -1 = current

// The JSON object for the selected version
const currentJson = computed(() => {
  if (selectedVersionIndex.value === -1) return currentData.value
  return revisions.value[selectedVersionIndex.value]?.previous_value ?? null
})

const currentJsonText = computed(() =>
  currentJson.value ? JSON.stringify(currentJson.value, null, 2) : ''
)

const highlighted = ref('')

// Highlight whenever selection changes
watch(currentJsonText, async (text) => {
  if (!text) { highlighted.value = ''; return }
  const hl = await loadHljs()
  highlighted.value = hl.highlight(text, { language: 'json' }).value
})

// Load data when modal opens
watch(() => props.modelValue, async (open) => {
  if (!open) return
  await fetchData()
})

async function fetchData() {
  loading.value = true
  error.value   = ''
  try {
    const res = await apiFetch(`/api/workorders/${props.woNum}/data`)
    currentData.value = res.raw_data
    revisions.value   = res.revisions
    selectedVersionIndex.value = -1
  } catch (e) {
    error.value = e?.data?.statusMessage || e?.message || 'Failed to load'
  } finally {
    loading.value = false
  }
}

function confirmDelete() {
  showDeleteConfirm.value = true
}

async function deleteRevision() {
  const rev = revisions.value[selectedVersionIndex.value]
  if (!rev) return
  deleting.value = true
  showDeleteConfirm.value = false
  try {
    await apiFetch(`/api/workorders/${props.woNum}/revisions/${rev.id}`, { method: 'DELETE' })
    revisions.value.splice(selectedVersionIndex.value, 1)
    selectedVersionIndex.value = -1
    emit('revisionsUpdated')
  } catch (e) {
    error.value = e?.data?.statusMessage || e?.message || 'Failed to delete'
  } finally {
    deleting.value = false
  }
}

async function copyJson() {
  if (!currentJsonText.value) return
  await navigator.clipboard.writeText(currentJsonText.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('en-NZ', { dateStyle: 'medium', timeStyle: 'short' })
}

// Load highlight.js once globally
let hljs = null
async function loadHljs() {
  if (hljs) return hljs
  await new Promise((resolve, reject) => {
    if (document.getElementById('hljs-script')) { resolve(); return }
    const s = document.createElement('script')
    s.id = 'hljs-script'
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js'
    s.onload = resolve; s.onerror = reject
    document.head.appendChild(s)
  })
  await new Promise((resolve, reject) => {
    if (document.getElementById('hljs-css')) { resolve(); return }
    const l = document.createElement('link')
    l.id = 'hljs-css'; l.rel = 'stylesheet'
    l.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css'
    l.onload = resolve; l.onerror = reject
    document.head.appendChild(l)
  })
  hljs = window.hljs
  return hljs
}
</script>