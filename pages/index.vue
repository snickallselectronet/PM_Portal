<!-- pages/index.vue -->
<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">

    <!-- Top bar -->
    <div class="bg-white border-b border-gray-200 px-8 py-3 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-2 h-2 rounded-full bg-green-500"></div>
        <span class="text-xs font-medium text-gray-500 tracking-widest uppercase">ElectroNet</span>
      </div>
      <span class="text-xs text-gray-400 font-mono">PM Portal</span>
    </div>

    <!-- Main content -->
    <div class="flex-1 flex flex-col justify-center px-8 py-16 max-w-5xl mx-auto w-full">

      <!-- Hero -->
      <div class="mb-16">
        <h1 class="text-5xl font-bold text-gray-900 tracking-tight leading-tight mb-4">
          Field Work<br>Management
        </h1>
        <p class="text-lg text-gray-500 max-w-xl leading-relaxed">
          Track Aurora network work orders from initial scoping through to completed field forms submitted by ElectroNet crews.
        </p>
      </div>

      <!-- Flow strip -->
      <div class="mb-14 flex items-center gap-0">
        <div class="flex items-center gap-3 px-5 py-3 bg-white border border-gray-200 rounded-l-lg">
          <span class="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5">01</span>
          <span class="text-sm font-medium text-gray-700">Aurora issues work orders</span>
        </div>
        <div class="w-8 h-px bg-gray-300 relative">
          <div class="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent border-l-gray-300"></div>
        </div>
        <div class="flex items-center gap-3 px-5 py-3 bg-white border-y border-gray-200">
          <span class="text-xs font-bold text-gray-500 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">02</span>
          <span class="text-sm font-medium text-gray-700">Posted to Survey123 as forms</span>
        </div>
        <div class="w-8 h-px bg-gray-300 relative">
          <div class="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent border-l-gray-300"></div>
        </div>
        <div class="flex items-center gap-3 px-5 py-3 bg-white border border-gray-200 rounded-r-lg">
          <span class="text-xs font-bold text-green-600 bg-green-50 border border-green-100 rounded px-1.5 py-0.5">03</span>
          <span class="text-sm font-medium text-gray-700">Field crews complete &amp; submit</span>
        </div>
      </div>

      <!-- Nav cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

        <!-- Issued Work Orders -->
        <NuxtLink
          to="/workorders"
          class="group relative bg-white rounded-xl border border-gray-200 p-8 hover:border-blue-300 hover:shadow-lg transition-all duration-200 overflow-hidden"
        >
          <!-- Accent bar -->
          <div class="absolute top-0 left-0 right-0 h-1 bg-blue-500 rounded-t-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>

          <div class="flex items-start justify-between mb-6">
            <div class="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <svg class="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <svg class="h-4 w-4 text-gray-300 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </div>

          <div class="mb-2 flex items-baseline gap-3">
            <h2 class="text-xl font-bold text-gray-900">Issued Work Orders</h2>
            <span class="text-xs font-medium text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">From Aurora</span>
          </div>
          <p class="text-sm text-gray-500 mb-6 leading-relaxed">
            The original work orders as scoped and issued by Aurora — asset details, replacement information, FSP notes, and document links. Use this before work begins.
          </p>

          <div class="pt-5 border-t border-gray-100 grid grid-cols-2 gap-y-2">
            <div class="flex items-center gap-2 text-xs text-gray-500">
              <div class="w-1 h-1 rounded-full bg-blue-400"></div>
              Asset & replacement lookup
            </div>
            <div class="flex items-center gap-2 text-xs text-gray-500">
              <div class="w-1 h-1 rounded-full bg-blue-400"></div>
              Scoping & FSP notes
            </div>
            <div class="flex items-center gap-2 text-xs text-gray-500">
              <div class="w-1 h-1 rounded-full bg-blue-400"></div>
              Document links
            </div>
            <div class="flex items-center gap-2 text-xs text-gray-500">
              <div class="w-1 h-1 rounded-full bg-blue-400"></div>
              Location & cost info
            </div>
          </div>
        </NuxtLink>

        <!-- Completed Field Forms -->
        <NuxtLink
          to="/completed"
          class="group relative bg-white rounded-xl border border-gray-200 p-8 hover:border-green-300 hover:shadow-lg transition-all duration-200 overflow-hidden"
        >
          <!-- Accent bar -->
          <div class="absolute top-0 left-0 right-0 h-1 bg-green-500 rounded-t-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>

          <div class="flex items-start justify-between mb-6">
            <div class="p-3 bg-green-50 rounded-lg border border-green-100">
              <svg class="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
              </svg>
            </div>
            <svg class="h-4 w-4 text-gray-300 group-hover:text-green-400 group-hover:translate-x-0.5 transition-all duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </div>

          <div class="mb-2 flex items-baseline gap-3">
            <h2 class="text-xl font-bold text-gray-900">Completed Field Forms</h2>
            <span class="text-xs font-medium text-green-600 bg-green-50 border border-green-100 px-2 py-0.5 rounded">Via Survey123</span>
          </div>
          <p class="text-sm text-gray-500 mb-6 leading-relaxed">
            Survey123 forms submitted by field crews once work is done. Review as-built details, track job progress, and update completion status across the team.
          </p>

          <div class="pt-5 border-t border-gray-100 grid grid-cols-2 gap-y-2">
            <div class="flex items-center gap-2 text-xs text-gray-500">
              <div class="w-1 h-1 rounded-full bg-green-400"></div>
              Progress tracking
            </div>
            <div class="flex items-center gap-2 text-xs text-gray-500">
              <div class="w-1 h-1 rounded-full bg-green-400"></div>
              As-built data
            </div>
            <div class="flex items-center gap-2 text-xs text-gray-500">
              <div class="w-1 h-1 rounded-full bg-green-400"></div>
              Status updates
            </div>
            <div class="flex items-center gap-2 text-xs text-gray-500">
              <div class="w-1 h-1 rounded-full bg-green-400"></div>
              Field comments
            </div>
          </div>
        </NuxtLink>

        <!-- Config — admin only -->
        <NuxtLink v-if="isAdmin"
          to="/config"
          class="group relative bg-white rounded-xl border border-gray-200 p-8 hover:border-gray-400 hover:shadow-lg transition-all duration-200 overflow-hidden"
        >
          <div class="absolute top-0 left-0 right-0 h-1 bg-gray-700 rounded-t-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>

          <div class="flex items-start justify-between mb-6">
            <div class="p-3 bg-gray-100 rounded-lg border border-gray-200">
              <svg class="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded">Admin</span>
              <svg class="h-4 w-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </div>
          </div>

          <div class="mb-2 flex items-baseline gap-3">
            <h2 class="text-xl font-bold text-gray-900">Config Editor</h2>
          </div>
          <p class="text-sm text-gray-500 mb-6 leading-relaxed">
            Manage asset mapping definitions and published form configurations used by the processing pipeline.
          </p>

          <div class="pt-5 border-t border-gray-100 grid grid-cols-2 gap-y-2">
            <div class="flex items-center gap-2 text-xs text-gray-500">
              <div class="w-1 h-1 rounded-full bg-gray-400"></div>
              Asset mapping rules
            </div>
            <div class="flex items-center gap-2 text-xs text-gray-500">
              <div class="w-1 h-1 rounded-full bg-gray-400"></div>
              Published forms
            </div>
          </div>
        </NuxtLink>

        <!-- Logs — admin only -->
        <NuxtLink v-if="isAdmin"
          to="/logs"
          class="group relative bg-white rounded-xl border border-gray-200 p-8 hover:border-amber-300 hover:shadow-lg transition-all duration-200 overflow-hidden"
        >
          <div class="absolute top-0 left-0 right-0 h-1 bg-amber-500 rounded-t-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>

          <div class="flex items-start justify-between mb-6">
            <div class="p-3 bg-amber-50 rounded-lg border border-amber-100">
              <svg class="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded">Admin</span>
              <svg class="h-4 w-4 text-gray-300 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </div>
          </div>

          <div class="mb-2 flex items-baseline gap-3">
            <h2 class="text-xl font-bold text-gray-900">Ingest Logs</h2>
          </div>
          <p class="text-sm text-gray-500 mb-6 leading-relaxed">
            Monitor API activity, track processing results and investigate errors from all work order ingest sources.
          </p>

          <div class="pt-5 border-t border-gray-100 grid grid-cols-2 gap-y-2">
            <div class="flex items-center gap-2 text-xs text-gray-500">
              <div class="w-1 h-1 rounded-full bg-amber-400"></div>
              Success &amp; error tracking
            </div>
            <div class="flex items-center gap-2 text-xs text-gray-500">
              <div class="w-1 h-1 rounded-full bg-amber-400"></div>
              Per source filtering
            </div>
          </div>
        </NuxtLink>

        <!-- Field Processing — admin only -->
        <NuxtLink v-if="isAdmin"
          to="/fieldlogs"
          class="group relative bg-white rounded-xl border border-gray-200 p-8 hover:border-orange-300 hover:shadow-lg transition-all duration-200 overflow-hidden"
        >
          <div class="absolute top-0 left-0 right-0 h-1 bg-orange-500 rounded-t-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>

          <div class="flex items-start justify-between mb-6">
            <div class="p-3 bg-orange-50 rounded-lg border border-orange-100">
              <svg class="h-5 w-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded">Admin</span>
              <svg class="h-4 w-4 text-gray-300 group-hover:text-orange-400 group-hover:translate-x-0.5 transition-all duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </div>
          </div>

          <div class="mb-2 flex items-baseline gap-3">
            <h2 class="text-xl font-bold text-gray-900">Field Processing</h2>
          </div>
          <p class="text-sm text-gray-500 mb-6 leading-relaxed">
            Test the field data processing pipeline against raw Survey123 JSON. View step-by-step run logs, inspect output, and manage attribute exclusion rules.
          </p>

          <div class="pt-5 border-t border-gray-100 grid grid-cols-2 gap-y-2">
            <div class="flex items-center gap-2 text-xs text-gray-500">
              <div class="w-1 h-1 rounded-full bg-orange-400"></div>
              Pipeline debugger
            </div>
            <div class="flex items-center gap-2 text-xs text-gray-500">
              <div class="w-1 h-1 rounded-full bg-orange-400"></div>
              Exclusions config
            </div>
          </div>
        </NuxtLink>

      </div>
    </div>

    <!-- Footer -->
    <div class="px-8 py-4 border-t border-gray-200 flex items-center justify-between">
      <span class="text-xs text-gray-400">ElectroNet — Internal use only</span>
      <button
        @click="logout"
        class="text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        Sign out
      </button>
    </div>

  </div>
</template>

<script setup>
const { isAdmin, logout } = useAuth()
</script>