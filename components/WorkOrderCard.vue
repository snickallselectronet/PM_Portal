<!-- components/WorkOrderCard.vue -->
<template>
  <div class="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">

    <!-- Header -->
    <div class="flex justify-between items-start mb-4">
      <div>
        <h3 class="text-lg font-semibold text-gray-900 font-mono">{{ wo.WONum }}</h3>
        <p class="text-sm text-gray-500">Parent: {{ wo.ParentWONum || '—' }}</p>
        <p v-if="wo._receivedAt" class="text-xs text-gray-400 mt-0.5">Received: {{ formatDate(wo._receivedAt) }}</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="openRawJson"
          class="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors border border-gray-200"
        >
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
          </svg>
          View Raw JSON
        </button>
        <span v-if="isEdited"
          class="px-2 py-1 text-xs font-bold rounded-full bg-orange-100 text-orange-700 border border-orange-200">
          Edited
        </span>
        <span
          class="px-3 py-1 text-xs font-bold rounded-full"
          :class="isReplacement
            ? 'bg-blue-100 text-blue-800 border border-blue-200'
            : 'bg-amber-100 text-amber-800 border border-amber-200'"
        >
          {{ isReplacement ? 'Replacement' : 'Maintenance' }}
        </span>
      </div>
    </div>

    <div class="space-y-2">

      <!-- Job Description -->
      <div v-if="wo.WorkDescription">
        <label class="text-sm font-medium text-gray-700">Job Description:</label>
        <p class="text-sm text-gray-900">{{ wo.WorkDescription }}</p>
      </div>

      <!-- Main Asset Section -->
      <div class="mt-3 pt-3 border-t border-gray-200">
        <p class="text-sm font-semibold text-gray-700 mb-2">Main Asset Section</p>
        <div class="space-y-2">

          <!-- Original sub-card -->
          <div class="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              {{ isReplacement ? 'Original' : 'Asset' }}
            </p>
            <div class="grid grid-cols-2 gap-x-4 gap-y-1">
              <div v-if="wo.MainAsset?.field_label || wo.MainAsset?.asset_tag">
                <label class="font-medium text-gray-500 text-xs">Tag:</label>
                <p class="text-gray-900 font-mono">{{ wo.MainAsset.field_label || wo.MainAsset.asset_tag }}</p>
              </div>
              <div v-if="wo.MainAsset?.asset_num">
                <label class="font-medium text-gray-500 text-xs">Asset Num:</label>
                <p class="text-gray-900 font-mono text-xs">{{ wo.MainAsset.asset_num }}</p>
              </div>
              <div v-if="wo.MainAsset?.description" class="col-span-2">
                <label class="font-medium text-gray-500 text-xs">Type:</label>
                <p class="text-gray-900">{{ wo.MainAsset.description }}</p>
              </div>
            </div>
          </div>

          <!-- Replacement sub-card -->
          <div v-if="isReplacement && wo.Replacement?.replacement_asset_num"
            class="rounded-md border border-green-200 bg-green-50 p-3 text-sm">
            <p class="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">Replacement</p>
            <div class="grid grid-cols-2 gap-x-4 gap-y-1">
              <div>
                <label class="font-medium text-green-600 text-xs">Asset Num:</label>
                <p class="text-green-800 font-mono text-xs">{{ wo.Replacement.replacement_asset_num }}</p>
              </div>
              <div v-if="wo.Replacement.new_material">
                <label class="font-medium text-green-600 text-xs">Material:</label>
                <p class="text-green-800">{{ wo.Replacement.new_material }}</p>
              </div>
              <div v-if="wo.Replacement.replacement_description" class="col-span-2">
                <label class="font-medium text-green-600 text-xs">Type:</label>
                <p class="text-green-800">{{ wo.Replacement.replacement_description }}</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- Key fields grid -->
      <div class="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 text-sm">
        <div v-if="wo.TargetFinishDate">
          <label class="font-medium text-gray-700">Target Finish:</label>
          <p class="text-gray-900">{{ wo.TargetFinishDate }}</p>
        </div>
        <div v-if="wo.ServiceAddress || wo.Location?.gxp">
          <label class="font-medium text-gray-700">Location:</label>
          <p class="text-gray-900">{{ wo.ServiceAddress || wo.Location?.gxp }}</p>
        </div>
        <div v-if="wo.Location?.network">
          <label class="font-medium text-gray-700">Network:</label>
          <p class="text-gray-900">{{ wo.Location.network }}</p>
        </div>
        <div v-if="wo.Cost?.total_cost > 0">
          <label class="font-medium text-gray-700">Est. Cost:</label>
          <p class="text-gray-900">{{ formatCost(wo.Cost.total_cost) }}</p>
        </div>
      </div>

      <!-- Multi-Asset Section -->
      <div v-if="wo.IsMultiAsset && wo.MultiAssets?.length > 0" class="mt-3 pt-3 border-t border-gray-200">
        <button
          @click="multiOpen = !multiOpen"
          class="flex items-center justify-between w-full text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
        >
          <span>Multi-Asset Section ({{ wo.MultiAssets.length }})</span>
          <svg class="h-4 w-4 transition-transform" :class="{ 'rotate-180': multiOpen }"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
        <div v-if="multiOpen" class="mt-2 space-y-3">
          <div v-for="(ma, idx) in wo.MultiAssets" :key="idx"
            class="rounded-md border border-gray-300 p-3 space-y-2">
            <p class="text-xs font-semibold text-gray-600 uppercase tracking-wide">Asset {{ idx + 1 }}</p>
            <div class="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm">
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                {{ ma.replacement_asset_num ? 'Original' : 'Asset' }}
              </p>
              <div class="grid grid-cols-2 gap-x-4 gap-y-1">
                <div v-if="ma.original_tag">
                  <label class="font-medium text-gray-500 text-xs">Tag:</label>
                  <p class="font-mono text-gray-900">{{ ma.original_tag }}</p>
                </div>
                <div>
                  <label class="font-medium text-gray-500 text-xs">Asset Num:</label>
                  <p class="font-mono text-xs text-gray-900">{{ ma.original_asset_num || '—' }}</p>
                </div>
                <div v-if="ma.original_description" class="col-span-2">
                  <label class="font-medium text-gray-500 text-xs">Type:</label>
                  <p class="text-gray-900">{{ ma.original_description }}</p>
                </div>
              </div>
            </div>
            <div v-if="ma.replacement_asset_num"
              class="rounded-md border border-green-200 bg-green-50 p-3 text-sm">
              <p class="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">Replacement</p>
              <div class="grid grid-cols-2 gap-x-4 gap-y-1">
                <div class="col-span-2">
                  <label class="font-medium text-green-600 text-xs">Asset Num:</label>
                  <p class="font-mono text-xs text-green-800">{{ ma.replacement_asset_num }}</p>
                </div>
                <div v-if="ma.replacement_description" class="col-span-2">
                  <label class="font-medium text-green-600 text-xs">Type:</label>
                  <p class="text-green-800">{{ ma.replacement_description }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Notes & FSP -->
      <div v-if="wo.LongDescription || wo.FSPNote" class="mt-3 pt-3 border-t border-gray-200">
        <button
          @click="notesOpen = !notesOpen"
          class="flex items-center justify-between w-full text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
        >
          <span>Notes &amp; FSP</span>
          <svg class="h-4 w-4 transition-transform" :class="{ 'rotate-180': notesOpen }"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
        <div v-if="notesOpen" class="mt-2 space-y-2 text-sm">
          <div v-if="wo.LongDescription">
            <label class="font-medium text-gray-700">Details:</label>
            <p class="text-gray-900 whitespace-pre-line">{{ wo.LongDescription }}</p>
          </div>
          <div v-if="wo.FSPNote">
            <label class="font-medium text-gray-700">FSP Note:</label>
            <p class="text-gray-900 whitespace-pre-line">{{ wo.FSPNote }}</p>
          </div>
        </div>
      </div>

      <!-- Documents -->
      <div v-if="wo.DocLinks?.length > 0" class="mt-3 pt-3 border-t border-gray-200">
        <button
          @click="docsOpen = !docsOpen"
          class="flex items-center justify-between w-full text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
        >
          <span>Documents ({{ wo.DocLinks.length }})</span>
          <svg class="h-4 w-4 transition-transform" :class="{ 'rotate-180': docsOpen }"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
        <div v-if="docsOpen" class="mt-2 space-y-1">
          <a v-for="(doc, idx) in wo.DocLinks" :key="idx"
            :href="doc.url" target="_blank" rel="noopener"
            class="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline">
            <svg class="h-3.5 w-3.5 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
            </svg>
            <span class="truncate">{{ doc.description || doc.url }}</span>
          </a>
        </div>
      </div>

      <!-- Map link -->
      <div v-if="wo.Location?.latitude && wo.Location?.longitude" class="mt-3 pt-3 border-t border-gray-200">
        <a :href="`https://maps.google.com/?q=${wo.Location.latitude},${wo.Location.longitude}`"
          target="_blank" rel="noopener"
          class="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          View on Google Maps
        </a>
      </div>

    </div>
  </div>

  <!-- Viewer modal -->
  <JsonViewer
    v-model="showViewer"
    :wo-num="String(wo.WONum)"
    @edit="openEditor"
    @saved="onSaved"
  />

  <!-- Editor modal -->
  <JsonEditor
    v-model="showEditor"
    :wo-num="String(wo.WONum)"
    :initial-json="editingJson"
    :current-json="currentJson"
    @saved="onSaved"
  />
</template>

<script setup>
const props = defineProps({
  wo: { type: Object, required: true }
})

const emit = defineEmits(['updated'])

const isReplacement = computed(() => props.wo.Replacement?.is_replacement)
const isEdited      = computed(() => props.wo._isEdited)

const multiOpen = ref(false)
const notesOpen = ref(false)
const docsOpen  = ref(false)

// ── Modals ───────────────────────────────────────────────────────────
const showViewer  = ref(false)
const showEditor  = ref(false)
const editingJson = ref(null)
const currentJson = ref(null)

function openRawJson() {
  showViewer.value = true
}

function openEditor({ selected, current }) {
  editingJson.value = selected
  currentJson.value = current
  showEditor.value  = true
}

function onSaved(newProcessedData) {
  emit('updated', { woNum: props.wo.WONum, newData: { ...newProcessedData, _isEdited: true } })
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-NZ', { dateStyle: 'medium', timeStyle: 'short' })
}

function formatCost(amount) {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(amount)
}
</script>