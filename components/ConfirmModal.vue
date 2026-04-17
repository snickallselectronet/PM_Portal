<!-- components/ConfirmModal.vue -->
<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0">
      <div v-if="modelValue" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50" @click="cancel"/>
        <Transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95">
          <div v-if="modelValue" class="relative bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <!-- Icon -->
            <div class="flex items-center gap-4 mb-4">
              <div class="shrink-0 flex items-center justify-center w-10 h-10 rounded-full"
                :class="iconBg">
                <svg class="h-5 w-5" :class="iconColor" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="iconPath"/>
                </svg>
              </div>
              <div>
                <h3 class="text-sm font-semibold text-gray-900">{{ title }}</h3>
                <p v-if="message" class="text-xs text-gray-500 mt-0.5">{{ message }}</p>
              </div>
            </div>
            <!-- Buttons -->
            <div class="flex justify-end gap-3">
              <button @click="cancel"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                {{ cancelLabel }}
              </button>
              <button @click="confirm"
                class="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
                :class="confirmClass">
                {{ confirmLabel }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
const props = defineProps({
  modelValue:   { type: Boolean, required: true },
  title:        { type: String,  default: 'Are you sure?' },
  message:      { type: String,  default: '' },
  confirmLabel: { type: String,  default: 'Confirm' },
  cancelLabel:  { type: String,  default: 'Cancel' },
  variant:      { type: String,  default: 'primary' }, // primary | danger | warning
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])

const iconBg    = computed(() => ({ primary: 'bg-blue-50', danger: 'bg-red-50',    warning: 'bg-amber-50'  }[props.variant]))
const iconColor = computed(() => ({ primary: 'text-blue-600', danger: 'text-red-600', warning: 'text-amber-600' }[props.variant]))
const iconPath  = computed(() => ({
  primary: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  danger:  'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
}[props.variant]))
const confirmClass = computed(() => ({
  primary: 'bg-blue-600 hover:bg-blue-700',
  danger:  'bg-red-600 hover:bg-red-700',
  warning: 'bg-amber-500 hover:bg-amber-600',
}[props.variant]))

function confirm() {
  emit('confirm')
  emit('update:modelValue', false)
}
function cancel() {
  emit('cancel')
  emit('update:modelValue', false)
}
</script>