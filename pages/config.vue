<!-- pages/config.vue -->
<template>
  <div class="min-h-screen bg-gray-50">
    <AppNav />
    <div class="container mx-auto px-4 py-8">

      <!-- Header -->
      <header class="mb-8 flex justify-between items-center">
        <div>
          <div class="mb-1">
            <NuxtLink to="/" class="text-sm text-gray-400 hover:text-gray-600 transition-colors">← Home</NuxtLink>
          </div>
          <h1 class="text-3xl font-bold text-gray-900 mb-2">Config Editor</h1>
          <p class="text-gray-600">Manage asset mapping and published form definitions</p>
        </div>
      </header>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-8">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p class="mt-2 text-gray-600">Loading config…</p>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p class="text-red-800">{{ error }}</p>
      </div>

      <div v-else>

        <!-- ── PUBLISHED FORMS ── -->
        <div class="mb-8 bg-white rounded-lg shadow-sm border border-gray-200">
          <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900">Published Forms</h2>
            <span class="text-sm text-gray-500">{{ forms.length }} forms</span>
          </div>

          <div class="overflow-x-auto">
            <table class="min-w-full text-sm divide-y divide-gray-100">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Form Name</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Layers</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="form in forms" :key="form.id" class="hover:bg-gray-50">
                  <template v-if="editingFormId === form.id">
                    <td class="px-6 py-3">
                      <input v-model="editFormDraft.form_name"
                        class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"/>
                    </td>
                    <td class="px-6 py-3">
                      <input v-model.number="editFormDraft.total_layer_count" type="number" min="1"
                        class="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
                    </td>
                    <td class="px-6 py-3">
                      <input type="checkbox" v-model="editFormDraft.is_active" class="h-4 w-4 text-blue-600 rounded border-gray-300"/>
                    </td>
                    <td class="px-6 py-3 text-right">
                      <div class="flex items-center justify-end gap-2">
                        <button @click="saveForm(form)"
                          :disabled="formSaving"
                          class="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:opacity-50 transition-colors">
                          {{ formSaving ? 'Saving…' : 'Save' }}
                        </button>
                        <button @click="cancelFormEdit"
                          class="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded hover:bg-gray-200 transition-colors">
                          Cancel
                        </button>
                      </div>
                    </td>
                  </template>
                  <template v-else>
                    <td class="px-6 py-3 font-mono font-medium text-gray-900">{{ form.form_name }}</td>
                    <td class="px-6 py-3 text-gray-600">{{ form.total_layer_count }}</td>
                    <td class="px-6 py-3">
                      <span :class="form.is_active
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : 'bg-gray-100 text-gray-500 border border-gray-200'"
                        class="px-2 py-0.5 text-xs font-semibold rounded-full">
                        {{ form.is_active ? 'Active' : 'Inactive' }}
                      </span>
                    </td>
                    <td class="px-6 py-3 text-right">
                      <button @click="editForm(form)"
                        class="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded hover:bg-gray-200 transition-colors">
                        Edit
                      </button>
                    </td>
                  </template>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ── ASSET MAPPING ── -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200">
          <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 class="text-lg font-semibold text-gray-900">Asset Mapping</h2>
              <p class="text-sm text-gray-500 mt-0.5">{{ activeMappings.length }} active, {{ inactiveMappings.length }} inactive</p>
            </div>
            <button @click="openAddModal"
              class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
              + Add Mapping
            </button>
          </div>

          <!-- Filter -->
          <div class="px-6 py-3 border-b border-gray-100 flex items-center gap-4">
            <div class="relative flex-1 max-w-sm">
              <input v-model="mappingFilter" type="text" placeholder="Filter by class, name, form…"
                class="w-full px-3 py-1.5 pl-8 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
              <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </div>
            <label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" v-model="showInactive" class="h-4 w-4 text-blue-600 rounded border-gray-300"/>
              Show inactive
            </label>
          </div>

          <div class="overflow-x-auto">
            <table class="min-w-full text-sm divide-y divide-gray-100">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset Name</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Form Layer</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Layer #</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Relate Key</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Use Point Layer GUID</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Save GUID to Child</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Children</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Match Terms</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="m in filteredMappings" :key="m.id"
                  :class="!m.is_active ? 'opacity-50 bg-gray-50' : 'hover:bg-gray-50'">
                  <td class="px-4 py-3 font-mono text-gray-700">{{ m.asset_class }}</td>
                  <td class="px-4 py-3 font-medium text-gray-900">{{ m.asset_name }}</td>
                  <td class="px-4 py-3">
                    <span class="px-2 py-0.5 text-xs font-medium rounded"
                      :class="m.form_service_layer === 'WO_POLE'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-purple-50 text-purple-700 border border-purple-200'">
                      {{ m.form_service_layer }}
                    </span>
                  </td>
                  <td class="px-4 py-3 font-mono text-gray-600">{{ m.form_service_layer_num }}</td>
                  <td class="px-4 py-3 font-mono text-xs text-gray-500">{{ m.relate_guid_key_name }}</td>
                  <td class="px-4 py-3 text-sm">
                    <span :class="m.use_point_layer_guid ? 'text-green-700 font-medium' : 'text-gray-400'">
                      {{ m.use_point_layer_guid ? 'true' : 'false' }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-sm">
                    <span :class="m.save_guid_to_child ? 'text-green-700 font-medium' : 'text-gray-400'">
                      {{ m.save_guid_to_child ? 'true' : 'false' }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-xs text-gray-500">
                    {{ m.child_keys?.length ? m.child_keys.join(', ') : '—' }}
                  </td>
                  <td class="px-4 py-3 text-xs text-gray-500">
                    {{ m.match_terms?.length ? m.match_terms.join(', ') : '—' }}
                  </td>
                  <td class="px-4 py-3">
                    <span :class="m.is_active
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : 'bg-gray-100 text-gray-500 border border-gray-200'"
                      class="px-2 py-0.5 text-xs font-semibold rounded-full">
                      {{ m.is_active ? 'Active' : 'Inactive' }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <button @click="openEditModal(m)"
                      class="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded hover:bg-gray-200 transition-colors">
                      Edit
                    </button>
                  </td>
                </tr>

                <tr v-if="filteredMappings.length === 0">
                  <td colspan="10" class="px-4 py-8 text-center text-gray-400 text-sm">No mappings match your filter</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>

    <!-- ── FORM CONFIRM MODAL ── -->
    <div v-if="confirmModal.open"
      class="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md">

        <div class="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
          <div class="p-2 bg-amber-50 rounded-lg border border-amber-200">
            <svg class="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-900">{{ confirmModal.title }}</h3>
        </div>

        <div class="px-6 py-5 space-y-4">
          <p class="text-sm text-gray-600 leading-relaxed">{{ confirmModal.message }}</p>

          <div v-if="confirmModal.impact"
            class="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            {{ confirmModal.impact }}
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Type <span class="font-mono font-bold text-gray-900">{{ confirmModal.confirmWord }}</span> to confirm
            </label>
            <input
              v-model="confirmModal.input"
              :placeholder="confirmModal.confirmWord"
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              @keydown.enter="confirmModal.input === confirmModal.confirmWord && proceedFormSave()"
            />
          </div>
        </div>

        <div class="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <button @click="confirmModal.open = false; confirmModal.input = ''"
            class="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">
            Cancel
          </button>
          <button
            @click="proceedFormSave"
            :disabled="confirmModal.input !== confirmModal.confirmWord || formSaving"
            class="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {{ formSaving ? 'Saving…' : 'Confirm Change' }}
          </button>
        </div>

      </div>
    </div>

    <!-- ── MAPPING MODAL ── -->
    <div v-if="modalOpen"
      class="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4"
      @click.self="closeModal">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ modalMode === 'add' ? 'Add Mapping' : 'Edit Mapping' }}
          </h3>
          <button @click="closeModal" class="text-gray-400 hover:text-gray-600">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="px-6 py-5 space-y-4">

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Asset Class</label>
              <input v-model="draft.asset_class"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g. 1360"/>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Asset Name</label>
              <input v-model="draft.asset_name"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g. POLE"/>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Form Service Layer</label>
              <select v-model="draft.form_service_layer"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option v-for="f in forms" :key="f.id" :value="f.form_name">{{ f.form_name }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Layer Number</label>
              <input v-model="draft.form_service_layer_num"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g. 6"/>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Relate GUID Key Name</label>
            <input v-model="draft.relate_guid_key_name"
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g. WONUM_GUID"/>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Parent Asset Name</label>
              <input v-model="draft.parent_asset_name"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g. POLE (leave blank if none)"/>
            </div>
            <div class="flex flex-col justify-end gap-3 pb-1">
              <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" v-model="draft.use_point_layer_guid" class="h-4 w-4 text-blue-600 rounded border-gray-300"/>
                Use Point Layer GUID
              </label>
              <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" v-model="draft.save_guid_to_child" class="h-4 w-4 text-blue-600 rounded border-gray-300"/>
                Save GUID to Child
              </label>
              <label v-if="modalMode === 'edit'" class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" v-model="draft.is_active" class="h-4 w-4 text-blue-600 rounded border-gray-300"/>
                Active
              </label>
            </div>
          </div>

          <!-- Child Keys -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Child Keys</label>
            <div class="flex flex-wrap gap-2 mb-2">
              <span v-for="(key, idx) in draft.child_keys" :key="idx"
                class="flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-mono rounded">
                {{ key }}
                <button @click="removeChildKey(idx)" class="text-blue-400 hover:text-blue-700 ml-1">×</button>
              </span>
            </div>
            <div class="flex gap-2">
              <input v-model="newChildKey" @keydown.enter.prevent="addChildKey"
                class="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Type a child key and press Enter"/>
              <button @click="addChildKey"
                class="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors">Add</button>
            </div>
          </div>

          <!-- Match Terms -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Match Terms</label>
            <div class="flex flex-wrap gap-2 mb-2">
              <span v-for="(term, idx) in draft.match_terms" :key="idx"
                class="flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded">
                {{ term }}
                <button @click="removeMatchTerm(idx)" class="text-amber-400 hover:text-amber-700 ml-1">×</button>
              </span>
            </div>
            <div class="flex gap-2">
              <input v-model="newMatchTerm" @keydown.enter.prevent="addMatchTerm"
                class="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Type a match term and press Enter"/>
              <button @click="addMatchTerm"
                class="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors">Add</button>
            </div>
          </div>

          <!-- Note -->
          <div v-if="modalMode === 'edit'">
            <label class="block text-sm font-medium text-gray-700 mb-1">Reason for change <span class="text-gray-400 font-normal">(optional — saved to revision history)</span></label>
            <input v-model="draft.note"
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g. Updated layer number after ArcGIS reconfiguration"/>
          </div>

          <!-- Error -->
          <div v-if="modalError" class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {{ modalError }}
          </div>

        </div>

        <div class="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <button v-if="modalMode === 'edit'"
            @click="toggleActive"
            :disabled="modalSaving"
            class="px-4 py-2 text-sm font-medium rounded-lg border transition-colors disabled:opacity-50"
            :class="draft.is_active
              ? 'border-red-200 text-red-600 hover:bg-red-50'
              : 'border-green-200 text-green-600 hover:bg-green-50'">
            {{ draft.is_active ? 'Deactivate' : 'Reactivate' }}
          </button>
          <div v-else></div>

          <div class="flex gap-3">
            <button @click="closeModal"
              class="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button @click="saveMapping"
              :disabled="modalSaving"
              class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {{ modalSaving ? 'Saving…' : modalMode === 'add' ? 'Add Mapping' : 'Save Changes' }}
            </button>
          </div>
        </div>

      </div>
    </div>

  </div>
</template>

<script setup>
// ── Data ─────────────────────────────────────────────────────
const { apiFetch } = useApi()
const loading = ref(true)
const error   = ref('')
const forms   = ref([])
const mappings = ref([])

onMounted(async () => {
  try {
    const res = await apiFetch('/api/config')
    forms.value    = res.forms
    mappings.value = res.mappings
  } catch (e) {
    error.value = e?.data?.statusMessage || e?.message || 'Failed to load config'
  } finally {
    loading.value = false
  }
})

// ── Published Forms editing ───────────────────────────────────
const editingFormId  = ref(null)
const editFormDraft  = ref({})
const formSaving     = ref(false)

function editForm(form) {
  editingFormId.value = form.id
  editFormDraft.value = { ...form }
}

function cancelFormEdit() {
  editingFormId.value = null
  editFormDraft.value = {}
}

// ── Form confirm modal ────────────────────────────────────────
const confirmModal = ref({
  open:        false,
  title:       '',
  message:     '',
  impact:      '',
  confirmWord: '',
  input:       '',
  pendingForm: null,   // the original form row
  changes:     {}      // the fields to save
})

function saveForm(form) {
  const draft = editFormDraft.value
  const nameChanged  = draft.form_name !== form.form_name
  const layersChanged = draft.total_layer_count !== form.total_layer_count

  // No sensitive changes — save directly
  if (!nameChanged && !layersChanged) {
    _doSaveForm(form, draft)
    return
  }

  // Build the confirm modal content
  const warnings = []
  let title = 'Confirm Change'
  let confirmWord = 'CONFIRM'

  if (nameChanged) {
    const affected = mappings.value.filter(m => m.form_service_layer === form.form_name).length
    title = 'Rename Form'
    confirmWord = draft.form_name.toUpperCase()
    warnings.push(
      `Renaming "${form.form_name}" to "${draft.form_name}" will automatically update all ` +
      `${affected} asset mapping${affected !== 1 ? 's' : ''} that reference this form. ` +
      `This cannot be undone without a manual rename back.`
    )
  }

  if (layersChanged) {
    const direction = draft.total_layer_count > form.total_layer_count ? 'increased' : 'decreased'
    warnings.push(
      `The layer count is being ${direction} from ${form.total_layer_count} to ${draft.total_layer_count}. ` +
      `The total layer count determines which related sub-layers are queried and deleted during ArcGIS ` +
      `operations (layers 1 through N-1 are treated as related tables). Setting this too low will cause ` +
      `related asset records to be missed; setting it too high may query non-existent layers and cause errors.`
    )
    if (!nameChanged) {
      title = 'Change Layer Count'
      confirmWord = String(draft.total_layer_count)
    }
  }

  confirmModal.value = {
    open:        true,
    title,
    message:     warnings[0],
    impact:      warnings[1] || '',
    confirmWord,
    input:       '',
    pendingForm: form,
    changes:     draft
  }
}

async function proceedFormSave() {
  const { pendingForm, changes } = confirmModal.value
  confirmModal.value.open = false
  confirmModal.value.input = ''
  await _doSaveForm(pendingForm, changes)
}

async function _doSaveForm(form, draft) {
  formSaving.value = true
  try {
    await apiFetch(`/api/config/form/${form.id}`, {
      method: 'PATCH',
      body: {
        form_name:         draft.form_name,
        total_layer_count: draft.total_layer_count,
        is_active:         draft.is_active
      }
    })
    // If renamed, update local mapping references too
    if (draft.form_name !== form.form_name) {
      mappings.value.forEach(m => {
        if (m.form_service_layer === form.form_name) {
          m.form_service_layer = draft.form_name
        }
      })
    }
    const idx = forms.value.findIndex(f => f.id === form.id)
    if (idx !== -1) forms.value[idx] = { ...form, ...draft }
    cancelFormEdit()
  } catch (e) {
    // Re-open confirm modal with error isn't ideal — show inline error instead
    alert(e?.data?.statusMessage || 'Failed to save form')
  } finally {
    formSaving.value = false
  }
}

// ── Mapping filter ────────────────────────────────────────────
const mappingFilter  = ref('')
const showInactive   = ref(false)

const activeMappings   = computed(() => mappings.value.filter(m => m.is_active))
const inactiveMappings = computed(() => mappings.value.filter(m => !m.is_active))

const filteredMappings = computed(() => {
  const kw = mappingFilter.value.trim().toLowerCase()
  return mappings.value.filter(m => {
    if (!showInactive.value && !m.is_active) return false
    if (!kw) return true
    return [m.asset_class, m.asset_name, m.form_service_layer, m.relate_guid_key_name,
            ...(m.child_keys || []), ...(m.match_terms || [])]
      .some(v => v?.toLowerCase().includes(kw))
  })
})

// ── Modal state ───────────────────────────────────────────────
const modalOpen   = ref(false)
const modalMode   = ref('add') // 'add' | 'edit'
const modalSaving = ref(false)
const modalError  = ref('')
const newChildKey  = ref('')
const newMatchTerm = ref('')

const emptyDraft = () => ({
  asset_class:           '',
  asset_name:            '',
  form_service_layer:    forms.value[0]?.form_name || '',
  form_service_layer_num:'',
  relate_guid_key_name:  'WONUM_GUID',
  use_point_layer_guid:  true,
  save_guid_to_child:    false,
  parent_asset_name:     '',
  child_keys:            [],
  match_terms:           [],
  is_active:             true,
  note:                  ''
})

const draft = ref(emptyDraft())

function openAddModal() {
  modalMode.value  = 'add'
  draft.value      = emptyDraft()
  modalError.value = ''
  modalOpen.value  = true
}

function openEditModal(m) {
  modalMode.value  = 'edit'
  draft.value      = {
    ...m,
    child_keys:  [...(m.child_keys || [])],
    match_terms: [...(m.match_terms || [])],
    note:        ''
  }
  modalError.value = ''
  modalOpen.value  = true
}

function closeModal() {
  modalOpen.value  = false
  newChildKey.value  = ''
  newMatchTerm.value = ''
}

function addChildKey() {
  const v = newChildKey.value.trim().toUpperCase()
  if (v && !draft.value.child_keys.includes(v)) draft.value.child_keys.push(v)
  newChildKey.value = ''
}

function removeChildKey(idx) {
  draft.value.child_keys.splice(idx, 1)
}

function addMatchTerm() {
  const v = newMatchTerm.value.trim()
  if (v && !draft.value.match_terms.includes(v)) draft.value.match_terms.push(v)
  newMatchTerm.value = ''
}

function removeMatchTerm(idx) {
  draft.value.match_terms.splice(idx, 1)
}

function toggleActive() {
  draft.value.is_active = !draft.value.is_active
}

async function saveMapping() {
  modalError.value = ''

  if (!draft.value.asset_class || !draft.value.asset_name || !draft.value.form_service_layer || !draft.value.form_service_layer_num || !draft.value.relate_guid_key_name) {
    modalError.value = 'Asset Class, Name, Form Layer, Layer Number and Relate Key are required.'
    return
  }

  modalSaving.value = true

  try {
    if (modalMode.value === 'add') {
      const { note, ...fields } = draft.value
      const res = await apiFetch('/api/config/mapping', {
        method: 'POST',
        body: fields
      })
      mappings.value.push(Array.isArray(res) ? res[0] : res)
    } else {
      const res = await apiFetch(`/api/config/mapping/${draft.value.id}`, {
        method: 'PATCH',
        body: draft.value
      })
      const updated = Array.isArray(res) ? res[0] : res
      const idx = mappings.value.findIndex(m => m.id === draft.value.id)
      if (idx !== -1) mappings.value[idx] = updated
    }
    closeModal()
  } catch (e) {
    modalError.value = e?.data?.statusMessage || e?.message || 'Failed to save mapping'
  } finally {
    modalSaving.value = false
  }
}
</script>