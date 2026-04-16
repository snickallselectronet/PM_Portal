<!-- components/JsonEditor.vue -->
<!-- Editor modal: left = current (read-only highlighted), right = editable textarea -->
<template>
  <Teleport to="body">
    <div v-if="modelValue"
      class="fixed inset-0 z-[60] flex items-center justify-center p-4"
      @click.self="closeEditor"
    >
      <div class="absolute inset-0 bg-black/60" @click="closeEditor"/>

      <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col">

        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 class="text-lg font-semibold text-gray-900 font-mono">WO {{ woNum }} — Edit JSON</h2>
            <p class="text-xs text-gray-500 mt-0.5">Left: current saved version &nbsp;·&nbsp; Right: your edits</p>
          </div>
          <div class="flex items-center gap-3">
            <!-- Optional note -->
            <input
              v-model="saveNote"
              type="text"
              placeholder="Note (optional)"
              class="text-xs border border-gray-300 rounded-lg px-3 py-1.5 w-48 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              @click="saveEdits"
              :disabled="saving || !!validationError"
              class="px-4 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-1.5"
            >
              <svg v-if="saving" class="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              {{ saving ? 'Saving…' : 'Save Version' }}
            </button>
            <button @click="closeEditor"
              class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Validation error bar -->
        <div v-if="validationError"
          class="px-6 py-2 bg-red-50 border-b border-red-200 text-xs text-red-600 flex-shrink-0">
          ⚠ {{ validationError }}
        </div>

        <!-- Save success bar -->
        <div v-if="saveSuccess"
          class="px-6 py-2 bg-green-50 border-b border-green-200 text-xs text-green-700 flex-shrink-0">
          ✓ Saved successfully
        </div>

        <!-- Split panels -->
        <div class="flex-1 overflow-hidden flex min-h-0">

          <!-- Left: current version (read-only) -->
          <div class="w-1/2 flex flex-col border-r border-gray-200 min-h-0">
            <div class="px-4 py-2 bg-gray-100 border-b border-gray-200 flex-shrink-0">
              <span class="text-xs font-medium text-gray-500">Current saved version</span>
            </div>
            <div class="flex-1 overflow-auto bg-gray-950">
              <pre class="hljs language-json p-4 text-xs leading-5" v-html="currentHighlighted"/>
            </div>
          </div>

          <!-- Right: editable -->
          <div class="w-1/2 flex flex-col min-h-0">
            <div class="px-4 py-2 bg-gray-100 border-b border-gray-200 flex-shrink-0 flex items-center justify-between">
              <span class="text-xs font-medium text-gray-500">Editing</span>
              <button @click="resetEdits"
                class="text-xs text-gray-400 hover:text-gray-700 transition-colors">
                Reset
              </button>
            </div>
            <textarea
              v-model="editText"
              @input="validateJson"
              spellcheck="false"
              class="flex-1 p-4 text-xs font-mono bg-gray-900 text-gray-100 leading-5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-br-xl"
            />
          </div>

        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup>
const props = defineProps({
  modelValue:  { type: Boolean, required: true },
  woNum:       { type: String,  required: true },
  initialJson: { type: Object,  default: null },  // the version to start editing from
  currentJson: { type: Object,  default: null },  // always the latest saved
})

const emit = defineEmits(['update:modelValue', 'saved'])

const { apiFetch } = useApi()

const editText       = ref('')
const saveNote       = ref('')
const saving         = ref(false)
const saveSuccess    = ref(false)
const validationError = ref('')
const currentHighlighted = ref('')

// When modal opens, populate both panels
watch(() => props.modelValue, async (open) => {
  if (!open) return
  saveSuccess.value    = false
  validationError.value = ''
  saveNote.value       = ''
  editText.value       = props.initialJson
    ? JSON.stringify(props.initialJson, null, 2)
    : ''

  const hl = await loadHljs()
  const currentText = props.currentJson
    ? JSON.stringify(props.currentJson, null, 2)
    : ''
  currentHighlighted.value = currentText
    ? hl.highlight(currentText, { language: 'json' }).value
    : ''
})

function validateJson() {
  try {
    JSON.parse(editText.value)
    validationError.value = ''
  } catch (e) {
    validationError.value = e.message
  }
}

function resetEdits() {
  editText.value = props.initialJson
    ? JSON.stringify(props.initialJson, null, 2)
    : ''
  validationError.value = ''
}

function closeEditor() {
  if (saving.value) return
  emit('update:modelValue', false)
}

async function saveEdits() {
  validateJson()
  if (validationError.value) return

  saving.value = true
  saveSuccess.value = false
  try {
    const res = await apiFetch(`/api/workorders/${props.woNum}/save`, {
      method: 'POST',
      body: {
        raw_data: JSON.parse(editText.value),
        note: saveNote.value || null,
      }
    })
    saveSuccess.value = true
    // Pass back the reprocessed data so the card updates
    emit('saved', res.processed_data)
    setTimeout(() => {
      saveSuccess.value = false
      emit('update:modelValue', false)
    }, 1500)
  } catch (e) {
    validationError.value = e?.data?.statusMessage || e?.message || 'Failed to save'
  } finally {
    saving.value = false
  }
}

// Load highlight.js once globally
let hljs = null
async function loadHljs() {
  if (hljs) return hljs
  await new Promise((resolve, reject) => {
    if (document.getElementById('hljs-script')) { resolve(); return }
    const s = document.createElement('script')
    s.id = 'hljs-script'; s.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js'
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