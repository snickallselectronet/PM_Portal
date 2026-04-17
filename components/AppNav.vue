<!-- components/AppNav.vue -->
<template>
  <div class="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-40">

    <!-- Left: brand + home link -->
    <div class="flex items-center gap-4">
      <NuxtLink to="/" class="flex items-center gap-3 group">
        <div class="w-2 h-2 rounded-full bg-green-500"></div>
        <span class="text-xs font-medium text-gray-500 tracking-widest uppercase group-hover:text-gray-800 transition-colors">
          ElectroNet
        </span>
      </NuxtLink>

      <!-- Divider + current page -->
      <div class="flex items-center gap-2 text-gray-300">
        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
        <span class="text-xs font-medium text-gray-600">{{ currentPageLabel }}</span>
      </div>
    </div>

    <!-- Right: nav links + sign out -->
    <div class="flex items-center gap-1">
      <NuxtLink
        v-for="link in visibleLinks"
        :key="link.to"
        :to="link.to"
        class="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
        :class="isActive(link.to)
          ? 'bg-blue-50 text-blue-600'
          : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'">
        {{ link.label }}
      </NuxtLink>

      <div class="w-px h-4 bg-gray-200 mx-2"/>

      <button @click="handleLogout" class="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
        Sign out
      </button>
    </div>

  </div>
</template>

<script setup>
const route  = useRoute()
const { isAdmin, logout } = useAuth()

const allLinks = [
  { to: '/workorders', label: 'Work Orders',       adminOnly: false },
  { to: '/completed',  label: 'Completed Forms',   adminOnly: false },
  { to: '/config',     label: 'Config',            adminOnly: true  },
  { to: '/logs',       label: 'Incoming WO Logs',       adminOnly: true  },
  { to: '/fieldlogs',  label: 'Field Data Processing',  adminOnly: true  },
]

const visibleLinks = computed(() =>
  allLinks.filter(l => !l.adminOnly || isAdmin.value)
)

const pageLabels = {
  '/workorders': 'Work Orders',
  '/completed':  'Completed Forms',
  '/config':     'Config Editor',
  '/logs':       'Incoming WO Logs',
  '/fieldlogs':  'Field Data Processing',
}

const currentPageLabel = computed(() => pageLabels[route.path] || 'PM Portal')

function isActive(to) {
  return route.path === to
}

async function handleLogout() {
  await logout()
  navigateTo('/login')
}
</script>