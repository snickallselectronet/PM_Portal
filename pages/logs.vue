<!-- pages/logs.vue -->
<template>
  <div class="min-h-screen bg-gray-50">
    <div class="container mx-auto px-4 py-8">

      <!-- Header -->
      <header class="mb-8 flex justify-between items-center">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 mb-2">Ingest Logs</h1>
          <p class="text-gray-600">API activity, processing results and errors</p>
        </div>
        <button @click="loadLogs"
          class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
          <svg class="h-4 w-4" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Refresh
        </button>
      </header>

      <!-- Filters -->
      <div class="mb-6 bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <div class="flex flex-wrap gap-4 items-center">
          <div class="flex items-center gap-2">
            <label class="text-xs font-medium text-gray-500">Status:</label>
            <div class="flex gap-1">
              <button v-for="s in statusFilters" :key="s.value"
                @click="filterStatus = s.value; loadLogs()"
                :class="[
                  'px-3 py-1 text-xs font-medium rounded-full border transition-colors',
                  filterStatus === s.value ? s.activeClass : 'border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200'
                ]">
                {{ s.label }}
              </button>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <label class="text-xs font-medium text-gray-500">Source:</label>
            <select v-model="filterSource" @change="loadLogs"
              class="text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500">
              <option value="">All</option>
              <option value="import_script">Import Script</option>
              <option value="c_sharp_relay">C# Relay</option>
              <option value="test_script">Test Script</option>
              <option value="field_processing">Field Processing</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>

          <div class="flex items-center gap-2">
            <label class="text-xs font-medium text-gray-500">WO:</label>
            <input v-model="filterWoNum" @keydown.enter="loadLogs" type="text"
              placeholder="e.g. 1086"
              class="text-xs border border-gray-300 rounded-lg px-2 py-1.5 w-24 focus:ring-2 focus:ring-blue-500"/>
          </div>

          <div class="ml-auto flex gap-4 text-xs text-gray-500">
            <span>{{ logs.length }} entries</span>
            <span class="text-green-600 font-medium">{{ successCount }} success</span>
            <span class="text-red-600 font-medium">{{ errorCount }} errors</span>
          </div>
        </div>
      </div>

      <div v-if="loading" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"/>
        <p class="mt-2 text-gray-600">Loading logs…</p>
      </div>
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4">
        <p class="text-red-800">{{ error }}</p>
      </div>
      <div v-else-if="logs.length === 0" class="text-center py-12 text-gray-500">
        No log entries found.
      </div>
      <div v-else class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200 text-sm">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">WO</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detail</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="log in logs" :key="log.id"
              :class="log.status === 'error' ? 'bg-red-50' : 'hover:bg-gray-50'">
              <td class="px-4 py-3 text-xs text-gray-500 whitespace-nowrap font-mono">{{ formatDate(log.logged_at) }}</td>
              <td class="px-4 py-3 font-mono text-xs font-medium text-gray-900">{{ log.wo_num || '—' }}</td>
              <td class="px-4 py-3">
                <span class="px-2 py-0.5 text-xs rounded-full font-medium" :class="sourceClass(log.source)">
                  {{ log.source || '—' }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span class="px-2 py-0.5 text-xs rounded-full font-bold"
                  :class="{
                    'bg-green-100 text-green-700': log.status === 'success',
                    'bg-red-100 text-red-700':     log.status === 'error',
                    'bg-gray-100 text-gray-600':   log.status === 'skipped',
                  }">
                  {{ log.status }}
                </span>
              </td>
              <td class="px-4 py-3 text-xs text-gray-700 max-w-sm truncate">{{ log.message }}</td>
              <td class="px-4 py-3">
                <button v-if="log.detail" @click="showDetail(log)"
                  class="text-xs text-blue-600 hover:text-blue-800 hover:underline">View</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>

    <!-- Detail modal -->
    <Teleport to="body">
      <div v-if="selectedLog" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="selectedLog = null">
        <div class="absolute inset-0 bg-black/50" @click="selectedLog = null"/>
        <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 class="text-base font-semibold text-gray-900">Log Detail</h2>
              <p class="text-xs text-gray-500 mt-0.5">{{ formatDate(selectedLog.logged_at) }} — WO {{ selectedLog.wo_num || '—' }}</p>
            </div>
            <button @click="selectedLog = null" class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="flex-1 overflow-auto p-6 bg-gray-950 rounded-b-xl">
            <pre class="text-xs font-mono text-gray-200 whitespace-pre-wrap">{{ JSON.stringify(selectedLog.detail, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
const { apiFetch } = useApi()

const logs        = ref([])
const loading     = ref(false)
const error       = ref('')
const selectedLog = ref(null)
const filterStatus = ref('')
const filterSource = ref('')
const filterWoNum  = ref('')

const statusFilters = [
  { value: '',        label: 'All',     activeClass: 'border-blue-200 bg-blue-100 text-blue-800' },
  { value: 'success', label: 'Success', activeClass: 'border-green-200 bg-green-100 text-green-800' },
  { value: 'error',   label: 'Errors',  activeClass: 'border-red-200 bg-red-100 text-red-800' },
  { value: 'skipped', label: 'Skipped', activeClass: 'border-gray-200 bg-gray-200 text-gray-700' },
]

const successCount = computed(() => logs.value.filter(l => l.status === 'success').length)
const errorCount   = computed(() => logs.value.filter(l => l.status === 'error').length)

async function loadLogs() {
  loading.value = true
  error.value   = ''
  try {
    const params = new URLSearchParams({ limit: '200' })
    if (filterStatus.value) params.set('status', filterStatus.value)
    if (filterSource.value) params.set('source', filterSource.value)
    if (filterWoNum.value)  params.set('wo_num', filterWoNum.value.trim())
    logs.value = await apiFetch(`/api/admin/logs?${params}`)
  } catch (e) {
    error.value = e?.data?.statusMessage || e?.message || 'Failed to load logs'
  } finally {
    loading.value = false
  }
}

function showDetail(log) { selectedLog.value = log }

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-NZ', { dateStyle: 'medium', timeStyle: 'short' })
}

function sourceClass(source) {
  const map = {
    import_script:    'bg-purple-100 text-purple-700',
    c_sharp_relay:    'bg-blue-100 text-blue-700',
    test_script:      'bg-yellow-100 text-yellow-700',
    field_processing: 'bg-orange-100 text-orange-700',
  }
  return map[source] || 'bg-gray-100 text-gray-600'
}

onMounted(loadLogs)
</script>