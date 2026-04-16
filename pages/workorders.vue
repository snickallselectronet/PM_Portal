<!-- pages/workorders.vue -->
<template>
  <div class="min-h-screen bg-gray-50">
    <div class="container mx-auto px-4 py-8">

      <!-- Header -->
      <header class="mb-8 flex justify-between items-center">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 mb-2">Work Order Viewer</h1>
          <p class="text-gray-600">Search Aurora work orders by WO number, asset tag, or address</p>
        </div>
        <div v-if="allData.length" class="hidden sm:flex gap-4 text-sm text-gray-500">
          <span>{{ allData.length }} work orders</span>
          <span class="text-blue-600">{{ replacementCount }} replacements</span>
          <span class="text-purple-600">{{ multiAssetCount }} multi-asset</span>
          <span v-if="updatedAt" class="text-gray-400">Updated: {{ formatDate(updatedAt) }}</span>
        </div>
      </header>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-8">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p class="mt-2 text-gray-600">Loading work orders…</p>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p class="text-red-800">{{ error }}</p>
      </div>

      <div v-else>
        <!-- WO Number Lookup -->
        <div class="mb-6 bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <h2 class="text-lg font-semibold text-gray-900 mb-1">Work Order Lookup</h2>
          <p class="text-sm text-gray-500 mb-3">
            Enter one or more WO or parent WO numbers — paste from Excel or type them in, separated by commas, spaces, or new lines.
          </p>

          <textarea
            v-model="woInput"
            rows="3"
            placeholder="e.g. 96784&#10;113578 (parent WO — returns all children)"
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
            @keydown.enter.exact.prevent="runLookup"
          />

          <div class="mt-3 flex gap-3">
            <button
              @click="runLookup"
              :disabled="!woInput.trim()"
              class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Look Up
            </button>
            <button
              v-if="lookupMode"
              @click="clearLookup"
              class="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              Clear
            </button>
          </div>

          <!-- Lookup results table -->
          <div v-if="lookupMode" class="mt-5 space-y-4">
            <div v-if="lookupFound.length > 0">
              <h3 class="text-sm font-semibold text-gray-700 mb-2">
                ✅ {{ lookupFound.length === 1 ? '1 work order found' : `Found (${lookupFound.length})` }}
              </h3>
              <div class="overflow-x-auto rounded-lg border border-gray-200">
                <table class="min-w-full text-sm divide-y divide-gray-200">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">WO Num</th>
                      <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset Tag</th>
                      <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Replacement</th>
                      <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target Finish</th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-100">
                    <tr v-for="wo in lookupFound" :key="wo.WONum" class="hover:bg-gray-50">
                      <td class="px-4 py-2 font-mono font-medium text-gray-900">{{ wo.WONum }}</td>
                      <td class="px-4 py-2 text-gray-600 max-w-xs truncate">{{ wo.WorkDescription || '—' }}</td>
                      <td class="px-4 py-2 font-mono text-gray-700">{{ wo.MainAsset?.field_label || wo.MainAsset?.asset_tag || '—' }}</td>
                      <td class="px-4 py-2 font-mono text-xs text-green-700">{{ wo.Replacement?.replacement_asset_num || '—' }}</td>
                      <td class="px-4 py-2 text-gray-600">{{ wo.TargetFinishDate || '—' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div v-if="lookupNotFound.length > 0">
              <h3 class="text-sm font-semibold text-red-700 mb-2">
                ❌ {{ lookupNotFound.length === 1 ? 'Not Found' : `Not Found (${lookupNotFound.length})` }}
              </h3>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="num in lookupNotFound"
                  :key="num"
                  class="px-3 py-1 bg-red-50 border border-red-300 text-red-700 text-xs font-mono rounded-full"
                >
                  {{ num }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Keyword Search -->
        <div class="mb-6">
          <div class="relative">
            <input
              v-model="keyword"
              @input="applyFilters"
              type="text"
              placeholder="Search by description, asset tag, asset number, address, GXP…"
              class="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </div>
          </div>
        </div>

        <!-- Filter Bar -->
        <div class="mb-6 bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div class="flex flex-wrap gap-3 items-center justify-between mb-3">
            <h2 class="text-lg font-semibold text-gray-900">
              Work Orders
              <span class="ml-2 text-sm font-normal text-gray-500">{{ displayedJobs.length }} result{{ displayedJobs.length !== 1 ? 's' : '' }}</span>
            </h2>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="f in filters"
                :key="f.value"
                @click="setFilter(f.value)"
                :class="[
                  'px-3 py-1.5 text-xs font-medium rounded-full border transition-colors',
                  activeFilter === f.value
                    ? 'border-blue-200 bg-blue-100 text-blue-800'
                    : 'border-gray-200 bg-gray-100 text-gray-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700'
                ]"
              >
                {{ f.label }}
              </button>
            </div>
          </div>

          <!-- Sort + Date range -->
          <div class="flex flex-wrap gap-3 items-center pt-3 border-t border-gray-100">
            <!-- Sort -->
            <div class="flex items-center gap-2">
              <label class="text-xs font-medium text-gray-500 whitespace-nowrap">Sort by:</label>
              <select v-model="sortBy" @change="applyFilters"
                class="text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="received_asc">Received (oldest first)</option>
                <option value="received_desc">Received (newest first)</option>
                <option value="wo_asc">WO Number (asc)</option>
                <option value="wo_desc">WO Number (desc)</option>
                <option value="finish_asc">Target Finish (earliest)</option>
                <option value="finish_desc">Target Finish (latest)</option>
              </select>
            </div>

            <!-- Date range -->
            <div class="flex items-center gap-2">
              <label class="text-xs font-medium text-gray-500 whitespace-nowrap">Received:</label>
              <input v-model="dateFrom" @change="applyFilters" type="date"
                class="text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
              <span class="text-xs text-gray-400">to</span>
              <input v-model="dateTo" @change="applyFilters" type="date"
                class="text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
              <button v-if="dateFrom || dateTo" @click="clearDates"
                class="text-xs text-gray-400 hover:text-gray-700 transition-colors">
                Clear
              </button>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-if="displayedJobs.length === 0" class="text-center py-12">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <h3 class="mt-4 text-lg font-medium text-gray-900">No work orders found</h3>
          <p class="mt-2 text-gray-500">Try adjusting your search or filter</p>
        </div>

        <!-- Cards grid -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <WorkOrderCard
            v-for="wo in displayedJobs"
            :key="wo.WONum"
            :wo="wo"
            @updated="onCardUpdated"
          />
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
const { apiFetch } = useApi()

// ── Data ────────────────────────────────────────────────────────────
const allData   = ref([])
const loading   = ref(true)
const error     = ref('')
const updatedAt = ref(null)

onMounted(async () => {
  try {
    const res = await apiFetch('/api/workorders')
    allData.value   = (res.data ?? []).filter(w => w?.WONum)
    updatedAt.value = res.updatedAt
  } catch (e) {
    error.value = e?.data?.statusMessage || e?.message || 'Failed to load work orders'
  } finally {
    loading.value = false
  }
  applyFilters()
})

// ── Stats ───────────────────────────────────────────────────────────
const replacementCount = computed(() => allData.value.filter(w => w.Replacement?.is_replacement).length)
const multiAssetCount  = computed(() => allData.value.filter(w => w.IsMultiAsset).length)

// ── Lookup ──────────────────────────────────────────────────────────
const woInput       = ref('')
const lookupMode    = ref(false)
const lookupFound   = ref([])
const lookupNotFound = ref([])

function parseBulkInput(raw) {
  return [...new Set(
    raw.split(/[\n\r\t,;]+/)
      .flatMap(s => s.split(/\s+/))
      .map(s => s.trim())
      .filter(Boolean)
  )]
}

function runLookup() {
  if (!woInput.value.trim()) return
  const requested = parseBulkInput(woInput.value)
  const woMap = new Map(allData.value.map(w => [String(w.WONum), w]))

  const found = []
  const notFound = []

  for (const num of requested) {
    if (woMap.has(num)) {
      found.push(woMap.get(num))
    } else {
      const children = allData.value.filter(w => String(w.ParentWONum) === num)
      if (children.length > 0) {
        children.forEach(c => { if (!found.includes(c)) found.push(c) })
      } else {
        notFound.push(num)
      }
    }
  }

  lookupFound.value    = found
  lookupNotFound.value = notFound
  lookupMode.value     = true
  applyFilters()
}

function clearLookup() {
  woInput.value        = ''
  lookupMode.value     = false
  lookupFound.value    = []
  lookupNotFound.value = []
  applyFilters()
}

// ── Filters & Search ────────────────────────────────────────────────
const keyword      = ref('')
const activeFilter = ref('all')
const sortBy       = ref('received_desc')
const dateFrom     = ref('')
const dateTo       = ref('')

const filters = [
  { value: 'all',         label: 'All' },
  { value: 'replacement', label: 'Replacements' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'multi',       label: 'Multi-Asset' },
]

function setFilter(f) {
  activeFilter.value = f
  applyFilters()
}

function clearDates() {
  dateFrom.value = ''
  dateTo.value   = ''
  applyFilters()
}

const displayedJobs = ref([])

function applyFilters() {
  const base = lookupMode.value ? lookupFound.value : allData.value
  const kw   = keyword.value.trim().toLowerCase()

  let data = base

  // Keyword search
  if (kw) {
    data = data.filter(w => searchableText(w).includes(kw))
  }

  // Type filter
  if (activeFilter.value === 'replacement') data = data.filter(w => w.Replacement?.is_replacement)
  if (activeFilter.value === 'maintenance') data = data.filter(w => !w.Replacement?.is_replacement)
  if (activeFilter.value === 'multi')       data = data.filter(w => w.IsMultiAsset)

  // Date range filter (on _receivedAt)
  if (dateFrom.value) {
    const from = new Date(dateFrom.value)
    data = data.filter(w => w._receivedAt && new Date(w._receivedAt) >= from)
  }
  if (dateTo.value) {
    const to = new Date(dateTo.value)
    to.setHours(23, 59, 59, 999)
    data = data.filter(w => w._receivedAt && new Date(w._receivedAt) <= to)
  }

  // Sort
  data = [...data].sort((a, b) => {
    switch (sortBy.value) {
      case 'received_asc':  return new Date(a._receivedAt || 0) - new Date(b._receivedAt || 0)
      case 'received_desc': return new Date(b._receivedAt || 0) - new Date(a._receivedAt || 0)
      case 'wo_asc':        return String(a.WONum).localeCompare(String(b.WONum), undefined, { numeric: true })
      case 'wo_desc':       return String(b.WONum).localeCompare(String(a.WONum), undefined, { numeric: true })
      case 'finish_asc':    return new Date(a.TargetFinishDate || 0) - new Date(b.TargetFinishDate || 0)
      case 'finish_desc':   return new Date(b.TargetFinishDate || 0) - new Date(a.TargetFinishDate || 0)
      default:              return 0
    }
  })

  displayedJobs.value = data
}

function searchableText(wo) {
  return [
    wo.WONum, wo.ParentWONum,
    wo.WorkDescription, wo.LongDescription, wo.FSPNote,
    wo.MainAsset?.asset_num, wo.MainAsset?.asset_tag, wo.MainAsset?.field_label,
    wo.MainAsset?.description, wo.MainAsset?.asset_location,
    wo.Replacement?.replacement_asset_num,
    wo.ServiceAddress,
    wo.Location?.gxp, wo.Location?.network,
    ...(wo.MultiAssets?.flatMap(m => [m.original_asset_num, m.original_tag, m.replacement_asset_num]) || [])
  ].filter(Boolean).join(' ').toLowerCase()
}

// ── Card update handler ─────────────────────────────────────────────
function onCardUpdated({ woNum, newData }) {
  const idx = allData.value.findIndex(w => String(w.WONum) === String(woNum))
  if (idx !== -1) {
    allData.value[idx] = { ...allData.value[idx], ...newData }
    applyFilters()
  }
}

// ── Helpers ─────────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-NZ', { dateStyle: 'medium', timeStyle: 'short' })
}
</script>