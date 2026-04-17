<!-- pages/fieldlogs.vue -->
<template>
  <div class="min-h-screen bg-gray-50">
    <div class="container mx-auto px-4 py-8">

      <!-- Header -->
      <header class="mb-8 flex justify-between items-center">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 mb-2">Field Processing Logs</h1>
          <p class="text-gray-600">Survey123 webhook runs, processing results and Power Automate send history</p>
        </div>
        <div class="flex gap-2">
          <button @click="showExclusions = true"
            class="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            Exclusions
          </button>
          <button @click="loadRuns"
            class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
            <svg class="h-4 w-4" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Refresh
          </button>
        </div>
      </header>

      <!-- Filters -->
      <div class="mb-6 bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <div class="flex flex-wrap gap-4 items-center">
          <div class="flex items-center gap-2">
            <label class="text-xs font-medium text-gray-500">Status:</label>
            <div class="flex gap-1">
              <button v-for="s in statusFilters" :key="s.value"
                @click="filterStatus = s.value; loadRuns()"
                :class="[
                  'px-3 py-1 text-xs font-medium rounded-full border transition-colors',
                  filterStatus === s.value ? s.activeClass : 'border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200'
                ]">
                {{ s.label }}
              </button>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <label class="text-xs font-medium text-gray-500">WO:</label>
            <input v-model="filterWoNum" @keydown.enter="loadRuns" type="text"
              placeholder="e.g. 1086"
              class="text-xs border border-gray-300 rounded-lg px-2 py-1.5 w-24 focus:ring-2 focus:ring-blue-500"/>
          </div>
          <div class="ml-auto flex gap-4 text-xs text-gray-500">
            <span>{{ runs.length }} runs</span>
            <span class="text-green-600 font-medium">{{ sentCount }} sent</span>
            <span class="text-red-600 font-medium">{{ errorCount }} errors</span>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"/>
        <p class="mt-2 text-gray-600">Loading runs…</p>
      </div>
      <div v-else-if="loadError" class="bg-red-50 border border-red-200 rounded-lg p-4">
        <p class="text-red-800">{{ loadError }}</p>
      </div>
      <div v-else-if="runs.length === 0" class="text-center py-12 text-gray-500">
        No processing runs found.
      </div>

      <!-- Runs table -->
      <div v-else class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200 text-sm">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Received</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">WO</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Error</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sent</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="run in runs" :key="run.id"
              :class="run.status === 'ERROR' ? 'bg-red-50' : 'hover:bg-gray-50'">
              <td class="px-4 py-3 text-xs text-gray-500 whitespace-nowrap font-mono">{{ formatDate(run.received_at) }}</td>
              <td class="px-4 py-3 font-mono text-xs font-medium text-gray-900">{{ run.wo_num || '—' }}</td>
              <td class="px-4 py-3">
                <span class="px-2 py-0.5 text-xs rounded-full font-bold" :class="statusClass(run.status)">
                  {{ run.status }}
                </span>
              </td>
              <td class="px-4 py-3 text-xs text-red-700 max-w-xs truncate">{{ run.error_message || '—' }}</td>
              <td class="px-4 py-3 text-xs text-gray-500 whitespace-nowrap font-mono">{{ run.sent_at ? formatDate(run.sent_at) : '—' }}</td>
              <td class="px-4 py-3 text-right">
                <button @click="openDetail(run)" class="text-xs text-blue-600 hover:text-blue-800 hover:underline">
                  View
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>

    <!-- ════════ Run Detail Modal ════════ -->
    <Teleport to="body">
      <div v-if="selectedRun" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="closeDetail">
        <div class="absolute inset-0 bg-black/50" @click="closeDetail"/>
        <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">

          <!-- Modal header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div class="flex items-center gap-4">
              <div>
                <h2 class="text-base font-semibold text-gray-900">Run — WO {{ selectedRun.wo_num || '—' }}</h2>
                <p class="text-xs text-gray-500 mt-0.5">{{ formatDate(selectedRun.received_at) }}</p>
              </div>
              <span class="px-2 py-0.5 text-xs rounded-full font-bold" :class="statusClass(selectedRun.status)">
                {{ selectedRun.status }}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <button
                v-if="selectedRun.status !== 'RECEIVED'"
                @click="confirmSend"
                :disabled="sending"
                class="px-3 py-1.5 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors flex items-center gap-1.5"
                :class="selectedRun.status === 'SENT' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'">
                <svg v-if="sending" class="h-3.5 w-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                {{ sending ? 'Sending…' : selectedRun.status === 'SENT' ? 'Resend to Power Automate' : 'Send to Power Automate' }}
              </button>
              <button @click="closeDetail" class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Send error -->
          <div v-if="sendError" class="mx-6 mt-3 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            {{ sendError }}
          </div>

          <!-- Detail tabs -->
          <div class="border-b border-gray-200 px-6">
            <nav class="flex gap-6">
              <button v-for="tab in detailTabs" :key="tab.id"
                @click="switchTab(tab.id)"
                :class="[
                  'py-3 text-sm font-medium border-b-2 transition-colors',
                  detailTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                ]">
                {{ tab.label }}
                <span v-if="tab.id === 'revisions' && selectedRun.revisions?.length" class="ml-1.5 px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">{{ selectedRun.revisions.length }}</span>
                <span v-if="tab.id === 'attachments' && selectedRun.attachments?.hasAttachments" class="ml-1.5 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-600 rounded-full">{{ (selectedRun.attachments.attachments?.length ?? 0) + (selectedRun.attachments.signatures?.length ?? 0) }}</span>
              </button>
            </nav>
          </div>

          <!-- Tab content -->
          <div class="flex-1 overflow-hidden flex flex-col min-h-0">

            <!-- ── Run Logs ── -->
            <div v-if="detailTab === 'logs'" class="flex-1 overflow-auto bg-gray-950 p-4 rounded-b-xl">
              <div v-if="selectedRun.error_message" class="text-red-400 text-xs font-mono mb-3 pb-3 border-b border-gray-700">
                ERROR: {{ selectedRun.error_message }}
              </div>
              <template v-if="selectedRun.run_logs?.length">
                <div v-for="(line, i) in selectedRun.run_logs" :key="i"
                  class="text-xs font-mono leading-relaxed py-0.5"
                  :class="{
                    'text-yellow-400': line.startsWith('Skipping'),
                    'text-red-400':    line.toLowerCase().includes('error'),
                    'text-gray-300':   !line.startsWith('Skipping') && !line.toLowerCase().includes('error'),
                  }">
                  <span class="text-gray-600 select-none mr-2">{{ String(i + 1).padStart(3, '0') }}</span>{{ line }}
                </div>
              </template>
              <p v-else class="text-xs text-gray-500 italic">No run logs available.</p>
            </div>

            <!-- ── Processed Output ── -->
            <div v-if="detailTab === 'output'" class="flex-1 overflow-hidden flex flex-col min-h-0">
              <div class="px-4 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
                <span class="text-xs text-gray-500">
                  {{ selectedRun.processed_output?.WOSpec?.length ?? 0 }} WOSpec entries
                </span>
                <div class="flex items-center gap-2">
                  <template v-if="!editingOutput">
                    <button @click="startEdit"
                      class="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors">
                      Edit
                    </button>
                  </template>
                  <template v-else>
                    <input v-model="editNote" placeholder="Note (optional)"
                      class="text-xs border border-gray-300 rounded px-2 py-1 w-48 focus:ring-1 focus:ring-blue-500"/>
                    <button @click="saveEdit" :disabled="editSaving || !!editJsonError"
                      class="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
                      {{ editSaving ? 'Saving…' : 'Save' }}
                    </button>
                    <button @click="cancelEdit"
                      class="px-3 py-1 bg-white border border-gray-300 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors">
                      Cancel
                    </button>
                  </template>
                </div>
              </div>
              <div v-if="editJsonError" class="px-4 py-1 text-xs text-red-600 bg-red-50 border-b border-red-200 shrink-0">
                {{ editJsonError }}
              </div>
              <div v-if="!editingOutput" class="flex-1 overflow-auto bg-gray-950 p-4">
                <pre class="text-xs font-mono text-gray-200 whitespace-pre-wrap">{{ JSON.stringify(selectedRun.processed_output, null, 2) }}</pre>
              </div>
              <div v-else class="flex-1 overflow-hidden grid grid-cols-2 divide-x divide-gray-700 min-h-0">
                <div class="overflow-auto bg-gray-950 p-4">
                  <p class="text-xs text-gray-500 mb-2 font-mono">Current</p>
                  <pre class="text-xs font-mono text-gray-400 whitespace-pre-wrap">{{ JSON.stringify(selectedRun.processed_output, null, 2) }}</pre>
                </div>
                <div class="flex flex-col min-h-0 bg-gray-950">
                  <p class="text-xs text-gray-500 px-4 py-2 font-mono border-b border-gray-700 shrink-0">Editing</p>
                  <textarea v-model="editValue" @input="validateEditJson"
                    class="flex-1 text-xs font-mono p-4 resize-none focus:outline-none bg-gray-950 text-gray-200"
                    spellcheck="false"/>
                </div>
              </div>
            </div>

            <!-- ── PA Response ── -->
            <div v-if="detailTab === 'pa'" class="flex-1 overflow-auto bg-gray-950 p-4 rounded-b-xl">
              <pre v-if="selectedRun.pa_response" class="text-xs font-mono text-gray-200 whitespace-pre-wrap">{{ JSON.stringify(selectedRun.pa_response, null, 2) }}</pre>
              <p v-else class="text-xs text-gray-500 italic">No Power Automate response yet.</p>
            </div>

            <!-- ── Attachments ── -->
            <div v-if="detailTab === 'attachments'" class="flex-1 overflow-auto p-4">
              <div v-if="tokenLoading" class="text-center py-8 text-gray-500 text-sm">Loading attachment access…</div>
              <div v-else-if="!selectedRun.attachments?.hasAttachments" class="text-center py-8 text-gray-500 text-sm">
                No attachments on this run.
              </div>
              <div v-else class="space-y-4">
                <div v-if="selectedRun.attachments?.attachments?.length">
                  <h3 class="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Photos ({{ selectedRun.attachments.attachments.length }})</h3>
                  <div class="space-y-2">
                    <div v-for="a in selectedRun.attachments.attachments" :key="a.globalId"
                      class="flex items-center justify-between px-4 py-2 bg-white border border-gray-200 rounded-lg">
                      <div class="flex items-center gap-3">
                        <svg class="h-4 w-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                        <div>
                          <p class="text-xs font-medium text-gray-900">{{ a.name }}</p>
                          <p class="text-xs text-gray-500">{{ (a.size / 1024).toFixed(1) }} KB</p>
                        </div>
                      </div>
                      <a :href="a.url + '?token=' + (freshToken || selectedRun.attachments.arcgisToken)" target="_blank"
                        class="text-xs text-blue-600 hover:text-blue-800 hover:underline">View</a>
                    </div>
                  </div>
                </div>
                <div v-if="selectedRun.attachments?.signatures?.length">
                  <h3 class="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Signatures ({{ selectedRun.attachments.signatures.length }})</h3>
                  <div class="space-y-2">
                    <div v-for="s in selectedRun.attachments.signatures" :key="s.globalId"
                      class="flex items-center justify-between px-4 py-2 bg-white border border-gray-200 rounded-lg">
                      <div class="flex items-center gap-3">
                        <svg class="h-4 w-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                        </svg>
                        <div>
                          <p class="text-xs font-medium text-gray-900">{{ s.name }}</p>
                          <p class="text-xs text-gray-500">{{ (s.size / 1024).toFixed(1) }} KB</p>
                        </div>
                      </div>
                      <a :href="s.url + '?token=' + (freshToken || selectedRun.attachments.arcgisToken)" target="_blank"
                        class="text-xs text-blue-600 hover:text-blue-800 hover:underline">View</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- ── Revisions ── -->
            <div v-if="detailTab === 'revisions'" class="flex-1 overflow-auto p-4">
              <div v-if="!selectedRun.revisions?.length" class="text-center py-8 text-gray-500 text-sm">
                No revisions yet.
              </div>
              <div v-else class="space-y-3">
                <div v-for="rev in selectedRun.revisions" :key="rev.id"
                  class="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div class="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
                    <div class="flex items-center gap-3">
                      <span class="text-xs font-mono text-gray-500">{{ formatDate(rev.changed_at) }}</span>
                      <span class="text-xs text-gray-700 font-medium">{{ rev.changed_by }}</span>
                      <span v-if="rev.note" class="text-xs text-gray-500 italic">{{ rev.note }}</span>
                    </div>
                    <button @click="confirmRestore(rev)"
                      class="text-xs text-blue-600 hover:text-blue-800 hover:underline">
                      Restore
                    </button>
                  </div>
                  <div class="p-3 bg-gray-950 max-h-48 overflow-auto">
                    <pre class="text-xs font-mono text-gray-400 whitespace-pre-wrap">{{ JSON.stringify(rev.previous_output, null, 2) }}</pre>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </Teleport>

    <!-- ════════ Exclusions Config Modal ════════ -->
    <Teleport to="body">
      <div v-if="showExclusions" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="showExclusions = false">
        <div class="absolute inset-0 bg-black/50" @click="showExclusions = false"/>
        <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 class="text-base font-semibold text-gray-900">Field Processing Exclusions</h2>
              <p class="text-xs text-gray-500 mt-0.5">Attributes skipped during field data processing</p>
            </div>
            <button @click="showExclusions = false" class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div class="flex gap-3 items-end">
              <div class="flex-1">
                <label class="block text-xs font-medium text-gray-700 mb-1">Attribute name</label>
                <input v-model="newExclusion.attribute" type="text" placeholder="e.g. MY_FIELD"
                  class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div class="flex-1">
                <label class="block text-xs font-medium text-gray-700 mb-1">Note (optional)</label>
                <input v-model="newExclusion.note" type="text" placeholder="Why this is excluded"
                  class="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"/>
              </div>
              <button @click="addExclusion" :disabled="!newExclusion.attribute.trim() || exclSaving"
                class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap">
                Add
              </button>
            </div>
            <p v-if="exclError" class="text-xs text-red-600 mt-2">{{ exclError }}</p>
          </div>
          <div class="flex-1 overflow-auto">
            <div v-if="exclLoading" class="text-center py-8 text-gray-500 text-sm">Loading…</div>
            <table v-else class="min-w-full divide-y divide-gray-200 text-sm">
              <thead class="bg-gray-50 sticky top-0">
                <tr>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Attribute</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Note</th>
                  <th class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Active</th>
                  <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="ex in exclusions" :key="ex.id"
                  :class="ex.is_active ? 'hover:bg-gray-50' : 'bg-gray-50 opacity-60'">
                  <td class="px-4 py-2 font-mono text-xs font-medium text-gray-900">{{ ex.attribute }}</td>
                  <td class="px-4 py-2 text-xs text-gray-500">{{ ex.note || '—' }}</td>
                  <td class="px-4 py-2 text-center">
                    <button @click="toggleExclusion(ex)"
                      :class="['inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border transition-colors',
                        ex.is_active ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200']">
                      {{ ex.is_active ? 'Active' : 'Inactive' }}
                    </button>
                  </td>
                  <td class="px-4 py-2 text-right">
                    <button @click="confirmDelete(ex)" class="text-xs text-red-600 hover:text-red-800 hover:underline">Delete</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ════════ Confirm Modal ════════ -->
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
  show:         false,
  title:        '',
  message:      '',
  confirmLabel: 'Confirm',
  variant:      'primary',
  onConfirm:    () => {},
})

function askConfirm({ title, message, confirmLabel = 'Confirm', variant = 'primary', onConfirm }) {
  confirmModal.title        = title
  confirmModal.message      = message
  confirmModal.confirmLabel = confirmLabel
  confirmModal.variant      = variant
  confirmModal.onConfirm    = onConfirm
  confirmModal.show         = true
}

// ── Runs list ─────────────────────────────────────────────────────────────────
const runs         = ref([])
const loading      = ref(false)
const loadError    = ref('')
const filterStatus = ref('')
const filterWoNum  = ref('')

const statusFilters = [
  { value: '',          label: 'All',       activeClass: 'border-blue-200 bg-blue-100 text-blue-800' },
  { value: 'RECEIVED',  label: 'Received',  activeClass: 'border-gray-200 bg-gray-200 text-gray-700' },
  { value: 'PROCESSED', label: 'Processed', activeClass: 'border-blue-200 bg-blue-100 text-blue-800' },
  { value: 'SENT',      label: 'Sent',      activeClass: 'border-green-200 bg-green-100 text-green-800' },
  { value: 'ERROR',     label: 'Errors',    activeClass: 'border-red-200 bg-red-100 text-red-800' },
]

const sentCount  = computed(() => runs.value.filter(r => r.status === 'SENT').length)
const errorCount = computed(() => runs.value.filter(r => r.status === 'ERROR').length)

async function loadRuns() {
  loading.value   = true
  loadError.value = ''
  try {
    const params = new URLSearchParams({ limit: '200' })
    if (filterStatus.value) params.set('status', filterStatus.value)
    if (filterWoNum.value)  params.set('wo_num', filterWoNum.value.trim())
    runs.value = await apiFetch(`/api/field-processing/runs?${params}`)
  } catch (e) {
    loadError.value = e?.data?.statusMessage || e?.message || 'Failed to load runs'
  } finally {
    loading.value = false
  }
}

function statusClass(status) {
  return {
    RECEIVED:  'bg-gray-100 text-gray-600',
    PROCESSED: 'bg-blue-100 text-blue-700',
    SENT:      'bg-green-100 text-green-700',
    ERROR:     'bg-red-100 text-red-700',
  }[status] || 'bg-gray-100 text-gray-600'
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-NZ', { dateStyle: 'medium', timeStyle: 'short' })
}

// ── Run detail modal ──────────────────────────────────────────────────────────
const selectedRun = ref(null)
const detailTab   = ref('logs')
const detailTabs  = [
  { id: 'logs',      label: 'Run Logs' },
  { id: 'output',    label: 'Processed Output' },
  { id: 'attachments', label: 'Attachments', badge: true },
  { id: 'pa',        label: 'PA Response' },
  { id: 'revisions', label: 'Revisions' },
]

async function openDetail(run) {
  detailTab.value     = 'logs'
  editingOutput.value = false
  sendError.value     = ''
  selectedRun.value   = null
  try {
    selectedRun.value = await apiFetch(`/api/field-processing/runs/${run.id}`)
  } catch (e) {
    loadError.value = e?.data?.statusMessage || e?.message || 'Failed to load run detail'
  }
}

function closeDetail() {
  selectedRun.value   = null
  editingOutput.value = false
  editValue.value     = ''
  editNote.value      = ''
  editJsonError.value = ''
  sendError.value     = ''
  freshToken.value    = ''
}

// ── Edit processed output ─────────────────────────────────────────────────────
const editingOutput = ref(false)
const editValue     = ref('')
const editNote      = ref('')
const editJsonError = ref('')
const editSaving    = ref(false)

function startEdit() {
  editValue.value     = JSON.stringify(selectedRun.value.processed_output, null, 2)
  editJsonError.value = ''
  editNote.value      = ''
  editingOutput.value = true
}

function validateEditJson() {
  try {
    JSON.parse(editValue.value)
    editJsonError.value = ''
  } catch {
    editJsonError.value = 'Invalid JSON'
  }
}

function cancelEdit() {
  editingOutput.value = false
  editValue.value     = ''
  editJsonError.value = ''
}

async function saveEdit() {
  if (editJsonError.value) return
  editSaving.value = true
  try {
    await apiFetch(`/api/field-processing/runs/${selectedRun.value.id}`, {
      method: 'PATCH',
      body: { processed_output: JSON.parse(editValue.value), note: editNote.value || null }
    })
    selectedRun.value   = await apiFetch(`/api/field-processing/runs/${selectedRun.value.id}`)
    editingOutput.value = false
    const idx = runs.value.findIndex(r => r.id === selectedRun.value.id)
    if (idx >= 0) runs.value[idx] = { ...runs.value[idx], updated_at: selectedRun.value.updated_at }
  } catch (e) {
    editJsonError.value = e?.data?.statusMessage || e?.message || 'Failed to save'
  } finally {
    editSaving.value = false
  }
}

// ── Restore revision ──────────────────────────────────────────────────────────
function confirmRestore(rev) {
  askConfirm({
    title:        'Restore this version?',
    message:      'The current output will be saved as a new revision before restoring.',
    confirmLabel: 'Restore',
    variant:      'warning',
    onConfirm:    () => doRestore(rev),
  })
}

function doRestore(rev) {
  editValue.value     = JSON.stringify(rev.previous_output, null, 2)
  editNote.value      = `Restored from ${formatDate(rev.changed_at)}`
  editingOutput.value = true
  detailTab.value     = 'output'
}

// ── Send to Power Automate ────────────────────────────────────────────────────
const sending   = ref(false)
const sendError = ref('')

function confirmSend() {
  const isResend = selectedRun.value.status === 'SENT'
  askConfirm({
    title:        isResend ? 'Resend to Power Automate?' : 'Send to Power Automate?',
    message:      isResend
      ? 'This will send the processed output again. The previous PA response will be overwritten.'
      : 'This will send the processed output to Power Automate.',
    confirmLabel: isResend ? 'Resend' : 'Send',
    variant:      isResend ? 'warning' : 'primary',
    onConfirm:    sendToPA,
  })
}

async function sendToPA() {
  sending.value   = true
  sendError.value = ''
  try {
    const res = await apiFetch(`/api/field-processing/runs/${selectedRun.value.id}/send`, { method: 'POST' })
    selectedRun.value = await apiFetch(`/api/field-processing/runs/${selectedRun.value.id}`)
    const idx = runs.value.findIndex(r => r.id === selectedRun.value.id)
    if (idx >= 0) runs.value[idx] = { ...runs.value[idx], status: selectedRun.value.status, sent_at: selectedRun.value.sent_at }
    if (!res.success) sendError.value = res.error || 'Send failed'
    else detailTab.value = 'pa'
  } catch (e) {
    sendError.value = e?.data?.statusMessage || e?.message || 'Send failed'
  } finally {
    sending.value = false
  }
}

// ── Exclusions ────────────────────────────────────────────────────────────────
const showExclusions = ref(false)
const exclusions     = ref([])
const exclLoading    = ref(false)
const exclSaving     = ref(false)
const exclError      = ref('')
const newExclusion   = ref({ attribute: '', note: '' })

watch(showExclusions, (open) => { if (open) loadExclusions() })

async function loadExclusions() {
  exclLoading.value = true
  exclError.value   = ''
  try {
    exclusions.value = await apiFetch('/api/config/exclusions')
  } catch (e) {
    exclError.value = e?.data?.statusMessage || e?.message || 'Failed to load'
  } finally {
    exclLoading.value = false
  }
}

async function addExclusion() {
  exclError.value  = ''
  exclSaving.value = true
  try {
    const created = await apiFetch('/api/config/exclusions', {
      method: 'POST',
      body: { attribute: newExclusion.value.attribute.trim(), note: newExclusion.value.note.trim() || null },
    })
    exclusions.value.push(created)
    exclusions.value.sort((a, b) => a.attribute.localeCompare(b.attribute))
    newExclusion.value = { attribute: '', note: '' }
  } catch (e) {
    exclError.value = e?.data?.statusMessage || e?.message || 'Failed to add'
  } finally {
    exclSaving.value = false
  }
}

async function toggleExclusion(ex) {
  try {
    const updated = await apiFetch(`/api/config/exclusions/${ex.id}`, {
      method: 'PATCH',
      body: { is_active: !ex.is_active },
    })
    Object.assign(ex, updated)
  } catch (e) {
    exclError.value = e?.data?.statusMessage || e?.message || 'Failed to update'
  }
}

function confirmDelete(ex) {
  askConfirm({
    title:        `Delete "${ex.attribute}"?`,
    message:      'This exclusion will be permanently removed.',
    confirmLabel: 'Delete',
    variant:      'danger',
    onConfirm:    () => doDeleteExclusion(ex),
  })
}

async function doDeleteExclusion(ex) {
  try {
    await apiFetch(`/api/config/exclusions/${ex.id}`, { method: 'DELETE' })
    exclusions.value = exclusions.value.filter(e => e.id !== ex.id)
  } catch (e) {
    exclError.value = e?.data?.statusMessage || e?.message || 'Failed to delete'
  }
}

// ── Fresh ArcGIS token for attachment viewing ─────────────────────────────
const freshToken  = ref('')
const tokenLoading = ref(false)

async function switchTab(id) {
  detailTab.value = id
  if (id === 'attachments' && selectedRun.value?.attachments?.hasAttachments && !freshToken.value) {
    tokenLoading.value = true
    try {
      const res = await apiFetch('/api/field-processing/arcgis-token')
      freshToken.value = res.token
    } catch {
      // Fall back to stored token silently
    } finally {
      tokenLoading.value = false
    }
  }
}

onMounted(loadRuns)
</script>