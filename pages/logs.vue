<!-- pages/logs.vue -->
<!-- File path: pages/logs.vue -->
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

      <!-- Manual Ingest Panel -->
      <div class="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <button @click="ingestPanel.open = !ingestPanel.open"
          class="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          <div class="flex items-center gap-2">
            <svg class="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
            </svg>
            Manual Ingest
          </div>
          <svg class="h-4 w-4 text-gray-400 transition-transform" :class="{ 'rotate-180': ingestPanel.open }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>

        <div v-if="ingestPanel.open" class="border-t border-gray-200 p-4">
          <!-- Drop zone -->
          <div
            @dragover.prevent="ingestPanel.dragging = true"
            @dragleave="ingestPanel.dragging = false"
            @drop.prevent="onIngestDrop"
            :class="[
              'border-2 border-dashed rounded-lg p-6 text-center mb-3 transition-colors cursor-pointer',
              ingestPanel.dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
            ]"
            @click="$refs.ingestFileInput.click()">
            <input ref="ingestFileInput" type="file" accept=".json" multiple class="hidden" @change="onIngestFileSelect"/>
            <svg class="h-8 w-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
            </svg>
            <p class="text-sm text-gray-500">Drop one or more <span class="font-medium">.json</span> files here or click to browse</p>
          </div>

          <!-- JSON textarea -->
          <textarea v-model="ingestPanel.json" rows="6" placeholder="...or paste JSON here"
            class="w-full text-xs font-mono border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 resize-y mb-3"/>

          <!-- Results -->
          <div v-if="ingestPanel.results.length" class="mb-3 space-y-1.5">
            <div v-for="(r, idx) in ingestPanel.results" :key="idx"
              class="px-3 py-2 rounded-lg text-xs font-medium flex items-start gap-2"
              :class="r.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'">
              <span class="shrink-0">{{ r.success ? '✓' : '✗' }}</span>
              <span>{{ r.message }}</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-3">
            <button @click="runManualIngest"
              :disabled="!ingestPanel.json.trim() || ingestPanel.loading"
              class="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2">
              <svg v-if="ingestPanel.loading" class="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              {{ ingestPanel.loading ? 'Ingesting…' : 'Ingest' }}
            </button>
            <button @click="ingestPanel.json = ''; ingestPanel.results = []"
              class="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
              Clear
            </button>
          </div>
        </div>
      </div>

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
            <tr v-for="log in logs" :key="log.id"
              :class="log.status === 'error' ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'"
              class="transition-colors">
              <td class="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{{ formatDate(log.logged_at) }}</td>
              <td class="px-4 py-3 text-xs font-mono font-medium text-gray-900">{{ log.wo_num || '—' }}</td>
              <td class="px-4 py-3">
                <span :class="sourceClass(log.source)" class="px-2 py-0.5 rounded-full text-xs font-medium">
                  {{ log.source || '—' }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span :class="statusClass(log.status)" class="px-2 py-0.5 rounded-full text-xs font-bold">
                  {{ log.status }}
                </span>
              </td>
              <td class="px-4 py-3 text-xs text-gray-700 max-w-xs truncate">{{ log.message }}</td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button v-if="log.wo_num" @click="openWoDetail(log)"
                    class="px-2 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition-colors">
                    View WO
                  </button>
                  <button @click="selectedLog = log"
                    class="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors">
                    Detail
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>

    <!-- WO Detail Drawer -->
    <Teleport to="body">
      <div v-if="woDetail.show" class="fixed inset-0 z-40 flex justify-end" @click.self="woDetail.show = false">
        <div class="absolute inset-0 bg-black/30" @click="woDetail.show = false"/>
        <div class="relative bg-white w-full max-w-3xl flex flex-col shadow-2xl overflow-hidden">

          <!-- Drawer header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
            <div>
              <h2 class="text-base font-semibold text-gray-900">WO {{ woDetail.woNum }}</h2>
              <p class="text-xs text-gray-500 mt-0.5">
                <span v-if="woDetail.isEdited" class="text-amber-600 font-medium mr-2">Edited</span>
                {{ woDetail.revisions.length }} revision{{ woDetail.revisions.length !== 1 ? 's' : '' }}
              </p>
            </div>
            <button @click="woDetail.show = false" class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Tab bar -->
          <div class="flex border-b border-gray-200 shrink-0 px-6">
            <button v-for="t in woTabs" :key="t.key" @click="woDetail.tab = t.key"
              :class="[
                'px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px',
                woDetail.tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'
              ]">
              {{ t.label }}
            </button>
          </div>

          <!-- Tab content -->
          <div class="flex-1 overflow-hidden flex flex-col min-h-0">

            <!-- Raw JSON tab -->
            <div v-if="woDetail.tab === 'raw'" class="flex-1 overflow-hidden flex flex-col min-h-0">
              <div class="px-4 py-2 border-b border-gray-200 bg-gray-50 flex items-center gap-3 shrink-0">
                <span class="text-xs text-gray-500">Version:</span>
                <select v-model="woDetail.selectedVersion" class="text-xs border border-gray-300 rounded px-2 py-1 bg-white">
                  <option :value="-1">Current</option>
                  <option v-for="(rev, i) in woDetail.revisions" :key="rev.id" :value="i">
                    {{ formatDate(rev.changed_at) }} — {{ rev.changed_by }}{{ rev.note ? ` (${rev.note})` : '' }}
                  </option>
                </select>
                <div class="ml-auto flex items-center gap-2">
                  <button v-if="woDetail.selectedVersion >= 0" @click="confirmDeleteRevision"
                    class="px-2 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-700 rounded transition-colors">
                    Delete revision
                  </button>
                  <button v-if="woDetail.selectedVersion >= 0" @click="confirmRestore(woDetail.revisions[woDetail.selectedVersion])"
                    class="px-2 py-1 text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 rounded transition-colors">
                    Restore this version
                  </button>
                  <button @click="openEditor"
                    class="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors">
                    Edit
                  </button>
                </div>
              </div>
              <div class="flex-1 overflow-auto bg-gray-950 p-4">
                <pre class="text-xs font-mono text-gray-200 whitespace-pre-wrap">{{ JSON.stringify(
                  woDetail.selectedVersion === -1
                    ? woDetail.rawData
                    : woDetail.revisions[woDetail.selectedVersion]?.previous_value,
                  null, 2) }}</pre>
              </div>
            </div>

            <!-- ArcGIS Payload tab -->
            <div v-if="woDetail.tab === 'arcgis'" class="flex-1 overflow-hidden flex flex-col min-h-0">
              <div class="px-4 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
                <span class="text-xs text-gray-500">
                  <template v-if="woDetail.arcgisPayload">
                    {{ woDetail.arcgisPayload.assets?.length ?? 0 }} assets · {{ woDetail.arcgisPayload.FormServiceLayer }}
                  </template>
                  <template v-else>Not yet processed</template>
                </span>
                <div class="flex items-center gap-2">
                  <span v-if="woDetail.woStatus" class="px-2 py-0.5 text-xs rounded-full font-bold"
                    :class="{
                      'bg-gray-100 text-gray-600':   woDetail.woStatus === 'RECEIVED',
                      'bg-blue-100 text-blue-700':   woDetail.woStatus === 'QUEUED',
                      'bg-green-100 text-green-700': woDetail.woStatus === 'SENT',
                      'bg-red-100 text-red-700':     woDetail.woStatus === 'ERROR',
                      'bg-gray-100 text-gray-500':   woDetail.woStatus === 'SKIPPED',
                    }">
                    {{ woDetail.woStatus }}
                  </span>
                  <button @click="reprocess" :disabled="woDetail.reprocessing"
                    class="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50 transition-colors">
                    {{ woDetail.reprocessing ? 'Processing…' : 'Reprocess' }}
                  </button>
                  <button @click="sendToArcGIS" :disabled="woDetail.sending || !woDetail.arcgisPayload"
                    class="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50 transition-colors">
                    {{ woDetail.sending ? 'Sending…' : 'Send to ArcGIS' }}
                  </button>
                  <button @click="showDeleteConfirm = true"
                    class="px-2 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-700 rounded transition-colors">
                    Delete from ArcGIS
                  </button>
                </div>
              </div>
              <div class="flex-1 overflow-auto bg-gray-950 p-4 space-y-4">
                <pre v-if="woDetail.arcgisPayload" class="text-xs font-mono text-gray-200 whitespace-pre-wrap">{{ JSON.stringify(woDetail.arcgisPayload, null, 2) }}</pre>
                <p v-else class="text-xs text-gray-500 italic">No ArcGIS payload — run Reprocess first.</p>
              </div>
            </div>

            <!-- Run Logs tab -->
            <div v-if="woDetail.tab === 'runlogs'" class="flex-1 overflow-hidden flex flex-col min-h-0">
              <div class="px-4 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
                <span class="text-xs text-gray-500">Last ArcGIS send response</span>
                <button v-if="woDetail.arcgisRunLogs?.length" @click="copyArcGISLogs"
                  class="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition-colors">
                  {{ arcgisLogsCopied ? 'Copied!' : 'Copy' }}
                </button>
              </div>
              <div class="flex-1 overflow-auto bg-gray-950 p-4">
                <div v-if="woDetail.arcgisRunLogs?.length" class="space-y-0.5">
                  <div v-for="(log, idx) in woDetail.arcgisRunLogs" :key="idx"
                    class="text-xs font-mono whitespace-pre-wrap"
                    :class="log.includes('failed') || log.includes('Error') ? 'text-red-400' : log.includes('succeeded') || log.includes('completed') ? 'text-green-400' : 'text-gray-300'">
                    <span class="text-gray-600 select-none mr-2">{{ String(idx + 1).padStart(3, '0') }}</span>{{ log }}
                  </div>
                </div>
                <p v-else class="text-xs text-gray-500 italic">No run logs yet.</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </Teleport>

    <!-- Delete from ArcGIS confirm -->
    <Teleport to="body">
      <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50" @click="showDeleteConfirm = false"/>
        <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
          <h3 class="text-base font-semibold text-gray-900 mb-2">Delete from ArcGIS?</h3>
          <p class="text-sm text-gray-600 mb-4">This will permanently delete {{ woDetail.arcgisPayload?.assets?.length ?? 0 }} ArcGIS records for WO <strong>{{ woDetail.woNum }}</strong> and reset the status to QUEUED. This cannot be undone.</p>
          <div class="flex justify-end gap-3">
            <button @click="showDeleteConfirm = false"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
              Cancel
            </button>
            <button @click="deleteFromArcGIS"
              class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">
              Delete
            </button>
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
      :ingest-log-id="woDetail.ingestLogId"
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
const config = useRuntimeConfig()

// ── Manual ingest panel ───────────────────────────────────────────────────────
const ingestPanel = reactive({
  open:     false,
  dragging: false,
  json:     '',
  loading:  false,
  results:  [],
})

function onIngestDrop(e) {
  ingestPanel.dragging = false
  const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.json'))
  if (!files.length) return
  if (files.length === 1) {
    readIngestFile(files[0])
  } else {
    ingestMultipleFiles(files)
  }
}

function onIngestFileSelect(e) {
  const files = Array.from(e.target.files)
  if (!files.length) return
  if (files.length === 1) {
    readIngestFile(files[0])
  } else {
    ingestMultipleFiles(files)
  }
  e.target.value = ''
}

function readIngestFile(file) {
  const reader = new FileReader()
  reader.onload = (e) => {
    ingestPanel.json    = e.target.result
    ingestPanel.results = []
  }
  reader.readAsText(file)
}

async function ingestMultipleFiles(files) {
  ingestPanel.loading = true
  ingestPanel.results = []
  ingestPanel.json    = ''

  for (const file of files) {
    const text = await file.text()
    let parsed
    try {
      parsed = JSON.parse(text)
    } catch {
      ingestPanel.results.push({ success: false, message: `${file.name}: Invalid JSON` })
      continue
    }
    try {
      const res = await apiFetch('/api/workorders/ingest', {
        method:  'POST',
        body:    parsed,
        headers: { 'x-source': 'manual_ingest', 'x-ingest-secret': config.public.ingestSecret },
      })
      const woNum  = res.wo_num ?? '?'
      const status = res.arcgis_status ?? ''
      ingestPanel.results.push({
        success: true,
        message: `${file.name} → WO ${woNum} ingested — ArcGIS: ${status}${res.reissue ? ' (re-issue)' : ''}`
      })
    } catch (e) {
      ingestPanel.results.push({
        success: false,
        message: `${file.name}: ${e?.data?.statusMessage || e?.message || 'Ingest failed'}`
      })
    }
  }

  await loadLogs()
  ingestPanel.loading = false
}

async function runManualIngest() {
  ingestPanel.result  = null
  ingestPanel.loading = true
  try {
    let parsed
    try {
      parsed = JSON.parse(ingestPanel.json)
    } catch {
      ingestPanel.result = { success: false, message: 'Invalid JSON — please check your input.' }
      return
    }

    const res = await apiFetch('/api/workorders/ingest', {
      method:  'POST',
      body:    parsed,
      headers: { 'x-source': 'manual_ingest', 'x-ingest-secret': config.public.ingestSecret },
    })

    const woNum  = res.wo_num ?? '?'
    const status = res.arcgis_status ?? ''
    ingestPanel.results = [{
      success: true,
      message: `WO ${woNum} ingested successfully — ArcGIS: ${status}${res.reissue ? ' (re-issue)' : ''}`
    }]
    await loadLogs()
  } catch (e) {
    ingestPanel.results = [{
      success: false,
      message: e?.data?.statusMessage || e?.message || 'Ingest failed'
    }]
  } finally {
    ingestPanel.loading = false
  }
}

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
  loading.value   = true
  loadError.value = ''
  try {
    const params = new URLSearchParams({ limit: '200' })
    if (filterStatus.value) params.set('status', filterStatus.value)
    if (filterSource.value) params.set('source', filterSource.value)
    if (filterWoNum.value)  params.set('wo_num', filterWoNum.value.trim())
    logs.value = await apiFetch(`/api/logs?${params}`)
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
    field_processing: 'bg-teal-100 text-teal-700',
    manual_ingest:    'bg-orange-100 text-orange-700',
  }
  return map[source] ?? 'bg-gray-100 text-gray-600'
}

function statusClass(status) {
  const map = {
    success: 'bg-green-100 text-green-700',
    error:   'bg-red-100 text-red-700',
    skipped: 'bg-gray-100 text-gray-500',
  }
  return map[status] ?? 'bg-gray-100 text-gray-600'
}

// ── WO Detail drawer ──────────────────────────────────────────────────────────
const woTabs = [
  { key: 'raw',     label: 'Raw JSON' },
  { key: 'arcgis',  label: 'ArcGIS Payload' },
  { key: 'runlogs', label: 'Run Logs' },
]

const woDetail = reactive({
  show:            false,
  woNum:           null,
  ingestLogId:     null,
  tab:             'raw',
  rawData:         null,
  arcgisPayload:   null,
  arcgisRunLogs:   null,
  woStatus:        null,
  revisions:       [],
  selectedVersion: -1,
  isEdited:        false,
  reprocessing:    false,
  sending:         false,
})

const showDeleteConfirm  = ref(false)
const showEditor         = ref(false)
const editingJson        = ref(null)
const arcgisLogsCopied   = ref(false)

async function openWoDetail(log) {
  woDetail.show            = true
  woDetail.woNum           = log.wo_num
  woDetail.ingestLogId     = log.id
  woDetail.tab             = 'raw'
  woDetail.rawData         = null
  woDetail.arcgisPayload   = null
  woDetail.arcgisRunLogs   = null
  woDetail.woStatus        = null
  woDetail.revisions       = []
  woDetail.selectedVersion = -1
  woDetail.isEdited        = false

  try {
    const params = log.id ? `?ingest_log_id=${log.id}` : ''
    const res = await apiFetch(`/api/workorders/${log.wo_num}/data${params}`)
    woDetail.rawData       = res.raw_data
    woDetail.arcgisPayload = res.arcgis_payload ?? null
    woDetail.arcgisRunLogs = res.arcgis_run?.logs ?? null
    woDetail.woStatus      = res.status ?? null
    woDetail.revisions     = res.revisions ?? []
    woDetail.isEdited      = res.is_edited ?? false
  } catch (e) {
    loadError.value = e?.data?.statusMessage || e?.message || 'Failed to load WO'
  }
}

async function reprocess() {
  woDetail.reprocessing = true
  try {
    const res = await apiFetch(`/api/workorders/${woDetail.woNum}/process`, { method: 'POST' })
    if (res.payload) woDetail.arcgisPayload = res.payload
    woDetail.woStatus = res.skipped ? 'SKIPPED' : 'QUEUED'
  } catch (e) {
    loadError.value = e?.data?.statusMessage || e?.message || 'Reprocess failed'
  } finally {
    woDetail.reprocessing = false
  }
}

async function sendToArcGIS() {
  woDetail.sending = true
  try {
    const res = await apiFetch(`/api/workorders/${woDetail.woNum}/send`, { method: 'POST' })
    woDetail.arcgisRunLogs = res.logs ?? null
    woDetail.woStatus      = 'SENT'
    woDetail.tab           = 'runlogs'
  } catch (e) {
    loadError.value = e?.data?.statusMessage || e?.message || 'Send failed'
  } finally {
    woDetail.sending = false
  }
}

async function deleteFromArcGIS() {
  showDeleteConfirm.value = false
  try {
    await apiFetch(`/api/workorders/${woDetail.woNum}/arcgis`, { method: 'DELETE' })
    woDetail.woStatus = 'QUEUED'
  } catch (e) {
    loadError.value = e?.data?.statusMessage || e?.message || 'Delete failed'
  }
}

async function copyArcGISLogs() {
  if (!woDetail.arcgisRunLogs?.length) return
  await navigator.clipboard.writeText(woDetail.arcgisRunLogs.join('\n'))
  arcgisLogsCopied.value = true
  setTimeout(() => { arcgisLogsCopied.value = false }, 2000)
}

function openEditor() {
  editingJson.value =
    woDetail.selectedVersion === -1
      ? woDetail.rawData
      : woDetail.revisions[woDetail.selectedVersion]?.previous_value
  showEditor.value = true
}

async function onEditSaved() {
  const params = woDetail.ingestLogId ? `?ingest_log_id=${woDetail.ingestLogId}` : ''
  const res = await apiFetch(`/api/workorders/${woDetail.woNum}/data${params}`)
  woDetail.rawData         = res.raw_data
  woDetail.arcgisPayload   = res.arcgis_payload ?? null
  woDetail.woStatus        = res.status ?? null
  woDetail.revisions       = res.revisions ?? []
  woDetail.isEdited        = true
  woDetail.selectedVersion = -1
  showEditor.value         = false
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