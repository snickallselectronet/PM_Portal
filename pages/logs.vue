<!-- pages/logs.vue -->
<template>
  <div class="min-h-screen bg-gray-50">
    <AppNav />
    <div class="container mx-auto px-4 py-8">

      <!-- Header -->
      <header class="mb-8 flex justify-between items-center">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 mb-2">Incoming WO Logs</h1>
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
      <div v-else-if="loadError" class="bg-red-50 border border-red-200 rounded-lg p-4">
        <p class="text-red-800">{{ loadError }}</p>
      </div>
      <div v-else-if="logs.length === 0" class="text-center py-12 text-gray-500">No log entries found.</div>

      <!-- Log table -->
      <div v-else class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200 text-sm">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">WO</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="log in logs" :key="log.id" :class="log.status === 'error' ? 'bg-red-50' : 'hover:bg-gray-50'">
              <td class="px-4 py-3 text-xs text-gray-500 whitespace-nowrap font-mono">{{ formatDate(log.logged_at) }}</td>
              <td class="px-4 py-3 font-mono text-xs font-medium text-gray-900">{{ log.wo_num || '—' }}</td>
              <td class="px-4 py-3">
                <span class="px-2 py-0.5 text-xs rounded-full font-medium" :class="sourceClass(log.source)">
                  {{ log.source || '—' }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span class="px-2 py-0.5 text-xs rounded-full font-bold" :class="{
                  'bg-green-100 text-green-700': log.status === 'success',
                  'bg-red-100 text-red-700':     log.status === 'error',
                  'bg-gray-100 text-gray-600':   log.status === 'skipped',
                }">{{ log.status }}</span>
              </td>
              <td class="px-4 py-3 text-xs text-gray-700 max-w-sm truncate">
                {{ log.message }}
                <span v-if="log.has_revisions"
                  class="ml-2 inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full border border-purple-200">
                  Revised
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-3">
                  <button v-if="log.wo_num" @click="openWoDetail(log.wo_num)"
                    class="text-xs text-blue-600 hover:text-blue-800 hover:underline">
                    View WO
                  </button>
                  <button v-if="log.detail" @click="selectedLog = log"
                    class="text-xs text-gray-500 hover:text-gray-800 hover:underline">
                    Raw Log
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>

    <!-- ════════ WO Detail Modal ════════ -->
    <Teleport to="body">
      <div v-if="woDetail.show" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="closeWoDetail">
        <div class="absolute inset-0 bg-black/50" @click="closeWoDetail"/>
        <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">

          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div class="flex items-center gap-4">
              <div>
                <h2 class="text-base font-semibold text-gray-900 font-mono">WO {{ woDetail.woNum }}</h2>
                <p class="text-xs text-gray-500 mt-0.5">Work order data</p>
              </div>
              <span v-if="woDetail.isEdited"
                class="px-2 py-0.5 text-xs font-bold rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                Edited
              </span>
            </div>
            <button @click="closeWoDetail" class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Tabs -->
          <div class="border-b border-gray-200 px-6">
            <nav class="flex gap-6">
              <button v-for="tab in woTabs" :key="tab.id"
                @click="woDetail.tab = tab.id"
                :class="[
                  'py-3 text-sm font-medium border-b-2 transition-colors',
                  woDetail.tab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                ]">
                {{ tab.label }}
                <span v-if="tab.id === 'revisions' && woDetail.revisions?.length"
                  class="ml-1.5 px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                  {{ woDetail.revisions.length }}
                </span>
              </button>
            </nav>
          </div>

          <div v-if="woDetail.loading" class="flex-1 flex items-center justify-center py-16">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"/>
          </div>

          <div v-else class="flex-1 overflow-hidden flex flex-col min-h-0">

            <!-- Raw JSON -->
            <div v-if="woDetail.tab === 'raw'" class="flex-1 overflow-hidden flex flex-col min-h-0">
              <div class="px-4 py-2 border-b border-gray-200 bg-gray-50 flex items-center gap-3 shrink-0">
                <label class="text-xs font-medium text-gray-600 whitespace-nowrap">Version:</label>
                <select v-model="woDetail.selectedVersion"
                  class="flex-1 text-xs border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500">
                  <option :value="-1">Current (latest saved)</option>
                  <option v-for="(rev, idx) in woDetail.revisions" :key="rev.id" :value="idx">
                    {{ formatDate(rev.changed_at) }} — {{ rev.changed_by }}{{ rev.note ? ` — ${rev.note}` : '' }}
                  </option>
                </select>
                <button @click="startRawEdit"
                  class="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap">
                  Edit
                </button>
                <button v-if="woDetail.selectedVersion >= 0" @click="confirmDeleteRevision"
                  class="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors whitespace-nowrap">
                  Delete Version
                </button>
              </div>
              <div class="flex-1 overflow-auto bg-gray-950 p-4">
                <pre class="text-xs font-mono text-gray-200 whitespace-pre-wrap">{{ selectedRawJson }}</pre>
              </div>
            </div>
            <!-- Revisions -->
            <div v-if="woDetail.tab === 'revisions'" class="flex-1 overflow-auto p-4">
              <div v-if="!woDetail.revisions?.length" class="text-center py-8 text-gray-500 text-sm">No revisions yet.</div>
              <div v-else class="space-y-3">
                <div v-for="rev in woDetail.revisions" :key="rev.id"
                  class="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div class="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
                    <div class="flex items-center gap-3">
                      <span class="text-xs font-mono text-gray-500">{{ formatDate(rev.changed_at) }}</span>
                      <span class="text-xs text-gray-700 font-medium">{{ rev.changed_by }}</span>
                      <span v-if="rev.note" class="text-xs text-gray-500 italic">{{ rev.note }}</span>
                    </div>
                    <button @click="confirmRestore(rev)"
                      class="text-xs text-blue-600 hover:text-blue-800 hover:underline">Restore</button>
                  </div>
                  <div class="p-3 bg-gray-950 max-h-48 overflow-auto">
                    <pre class="text-xs font-mono text-gray-400 whitespace-pre-wrap">{{ JSON.stringify(rev.previous_value, null, 2) }}</pre>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </Teleport>

    <!-- JsonEditor for raw JSON editing -->
    <JsonEditor
      v-if="woDetail.show && woDetail.woNum"
      v-model="showEditor"
      :wo-num="woDetail.woNum"
      :initial-json="editingJson"
      :current-json="woDetail.rawData"
      @saved="onEditSaved"
    />

    <!-- Raw Log Detail Modal -->
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

    <!-- Confirm Modal -->
    <ConfirmModal
      v-model="confirmModal.show"
      :title="confirmModal.title"
      :message="confirmModal.message"
      :confirm-label="confirmModal.confirmLabel"
      :variant="confirmModal.variant"
      @confirm="confirmModal.onConfirm"
    />

  </div>
</template>

<script setup>
const { apiFetch } = useApi()

// ── Confirm modal ─────────────────────────────────────────────────────────────
const confirmModal = reactive({
  show: false, title: '', message: '', confirmLabel: 'Confirm', variant: 'primary', onConfirm: () => {}
})
function askConfirm({ title, message, confirmLabel = 'Confirm', variant = 'primary', onConfirm }) {
  Object.assign(confirmModal, { show: true, title, message, confirmLabel, variant, onConfirm })
}

// ── Logs ──────────────────────────────────────────────────────────────────────
const logs         = ref([])
const loading      = ref(false)
const loadError    = ref('')
const selectedLog  = ref(null)
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
  loading.value  = true
  loadError.value = ''
  try {
    const params = new URLSearchParams({ limit: '200' })
    if (filterStatus.value) params.set('status', filterStatus.value)
    if (filterSource.value) params.set('source', filterSource.value)
    if (filterWoNum.value)  params.set('wo_num', filterWoNum.value.trim())
    logs.value = await apiFetch(`/api/admin/logs?${params}`)
  } catch (e) {
    loadError.value = e?.data?.statusMessage || e?.message || 'Failed to load logs'
  } finally {
    loading.value = false
  }
}

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

// ── WO Detail modal ───────────────────────────────────────────────────────────
const woTabs = [
  { id: 'raw',       label: 'Raw JSON' },
  { id: 'revisions', label: 'Revisions' },
]

const woDetail = reactive({
  show:            false,
  loading:         false,
  woNum:           '',
  tab:             'raw',
  rawData:         null,
  processedData:   null,
  revisions:       [],
  isEdited:        false,
  selectedVersion: -1,
})

const selectedRawJson = computed(() => {
  if (woDetail.selectedVersion === -1) return JSON.stringify(woDetail.rawData, null, 2)
  return JSON.stringify(woDetail.revisions[woDetail.selectedVersion]?.previous_value ?? null, null, 2)
})

async function openWoDetail(woNum) {
  Object.assign(woDetail, {
    show: true, loading: true, woNum, tab: 'raw',
    rawData: null, processedData: null, revisions: [],
    isEdited: false, selectedVersion: -1,
  })
  try {
    const res = await apiFetch(`/api/workorders/${woNum}/data`)
    woDetail.rawData       = res.raw_data
    woDetail.processedData = res.processed_data
    woDetail.revisions     = res.revisions ?? []
    woDetail.isEdited      = res.is_edited
  } catch (e) {
    loadError.value = e?.data?.statusMessage || e?.message || 'Failed to load WO'
    woDetail.show = false
  } finally {
    woDetail.loading = false
  }
}

function closeWoDetail() {
  woDetail.show    = false
  showEditor.value = false
}

// ── Edit raw JSON ─────────────────────────────────────────────────────────────
const showEditor  = ref(false)
const editingJson = ref(null)

function startRawEdit() {
  editingJson.value = woDetail.selectedVersion === -1
    ? woDetail.rawData
    : woDetail.revisions[woDetail.selectedVersion]?.previous_value
  showEditor.value = true
}

async function onEditSaved() {
  const res = await apiFetch(`/api/workorders/${woDetail.woNum}/data`)
  woDetail.rawData       = res.raw_data
  woDetail.processedData = res.processed_data
  woDetail.revisions     = res.revisions ?? []
  woDetail.isEdited      = true
  woDetail.selectedVersion = -1
  showEditor.value = false
}

// ── Delete revision ───────────────────────────────────────────────────────────
function confirmDeleteRevision() {
  askConfirm({
    title:        'Delete this revision?',
    message:      'This revision will be permanently removed.',
    confirmLabel: 'Delete',
    variant:      'danger',
    onConfirm:    doDeleteRevision,
  })
}

async function doDeleteRevision() {
  const rev = woDetail.revisions[woDetail.selectedVersion]
  if (!rev) return
  try {
    await apiFetch(`/api/workorders/${woDetail.woNum}/revisions/${rev.id}`, { method: 'DELETE' })
    woDetail.revisions.splice(woDetail.selectedVersion, 1)
    woDetail.selectedVersion = -1
  } catch (e) {
    loadError.value = e?.data?.statusMessage || e?.message || 'Failed to delete'
  }
}

// ── Restore revision ──────────────────────────────────────────────────────────
function confirmRestore(rev) {
  askConfirm({
    title:        'Restore this version?',
    message:      'The current raw JSON will be saved as a new revision before restoring.',
    confirmLabel: 'Restore',
    variant:      'warning',
    onConfirm:    () => doRestore(rev),
  })
}

function doRestore(rev) {
  editingJson.value = rev.previous_value
  showEditor.value  = true
  woDetail.tab      = 'raw'
}

onMounted(loadLogs)
</script>