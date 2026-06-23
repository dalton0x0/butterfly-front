<script setup>
// Catalogue des exercices de l'apprenant.
// GET /api/users/me/exercises renvoie tous les exercices visibles (y compris
// NOT_STARTED) avec leur statut. On filtre par statut côté client.
import {ref, computed, onMounted} from 'vue'
import {exerciseService} from '@/services/exerciseService'
import Icon from '@/components/Icon.vue'
import StatusChip from '@/components/StatusChip.vue'
import Breadcrumb from '@/components/Breadcrumb.vue'

const loading = ref(true)
const error = ref('')
const exercises = ref([])

const STATUS_MAP = {
  NOT_STARTED: {label: 'À faire', variant: 'neutral', icon: 'radio_button_unchecked'},
  IN_PROGRESS: {label: 'En cours', variant: 'primary', icon: 'schedule'},
  SUBMITTED: {label: 'En attente', variant: 'warning', icon: 'schedule'},
  VALIDATED: {label: 'Validé', variant: 'success', icon: 'check_circle'},
  REJECTED: {label: 'Rejeté', variant: 'danger', icon: 'cancel'}
}

function statusChip(status) {
  return STATUS_MAP[status] || STATUS_MAP.NOT_STARTED
}

const filter = ref('all')
const filters = [
  {key: 'all', label: 'Tous'},
  {key: 'NOT_STARTED', label: 'À faire'},
  {key: 'SUBMITTED', label: 'En attente'},
  {key: 'VALIDATED', label: 'Validés'},
  {key: 'REJECTED', label: 'Rejetés'}
]
const filtered = computed(() => {
  if (filter.value === 'all') {
    return exercises.value
  }
  return exercises.value.filter((e) => e.status === filter.value)
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const page = await exerciseService.getMyExercises()
    exercises.value = page.items
  } catch (err) {
    error.value = err.message || 'Impossible de charger les exercices.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <Breadcrumb :items="[{ label: 'Accueil', to: '/' }, { label: 'Mes exercices' }]"/>

  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
    <h1 class="text-[30px] font-semibold text-navy">Mes exercices</h1>
    <div class="inline-flex bg-surface rounded-full p-1 shadow-[var(--shadow-card)] flex-wrap">
      <button
          v-for="f in filters"
          :key="f.key"
          class="px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
          :class="filter === f.key ? 'bg-primary text-white' : 'text-ink-soft hover:text-ink'"
          @click="filter = f.key"
      >
        {{ f.label }}
      </button>
    </div>
  </div>

  <div v-if="loading" class="text-[15px] text-muted py-10 text-center">Chargement des exercices...</div>
  <div v-else-if="error" class="text-[15px] text-danger bg-danger/8 rounded-[10px] px-4 py-3">{{ error }}</div>
  <div v-else-if="filtered.length === 0" class="text-[15px] text-muted py-10 text-center">Aucun exercice à afficher.
  </div>

  <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <RouterLink
        v-for="e in filtered"
        :key="e.id"
        :to="`/exercices/${e.id}`"
        class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-5 flex items-center gap-4 hover:shadow-md transition-shadow"
    >
      <div class="w-11 h-11 rounded-xl bg-surface-tint flex items-center justify-center text-primary shrink-0">
        <Icon name="terminal" :size="22"/>
      </div>
      <div class="flex-1 min-w-0">
        <span class="text-[15px] font-medium text-ink block truncate">{{ e.name }}</span>
        <span class="text-[13px] text-muted">{{ e.moduleName }}</span>
      </div>
      <StatusChip v-bind="statusChip(e.status)"/>
      <Icon name="chevron_right" :size="20" class="text-muted shrink-0"/>
    </RouterLink>
  </div>
</template>
