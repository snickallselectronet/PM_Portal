<template>
  <div class="mb-6">
    <div class="relative">
      <input
        v-model="searchTerm"
        @input="onSearch"
        @keyup.enter="onSearch"
        type="text"
        placeholder="Search by Work Order Number, Parent WO Number, or Description..."
        class="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup>
const emit = defineEmits(['search'])

const searchTerm = ref('')

const onSearch = () => {
  emit('search', searchTerm.value)
}
</script>