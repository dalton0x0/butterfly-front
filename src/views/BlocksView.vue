<script setup>
// Catalogue des blocs : cartes avec cover et progression.
// Les blocs viennent de GET /api/blocks, la progression de chaque bloc vient
// de GET /api/users/me/blocks (fusionnée par blockId). Le statut affiché est
// dérivé du pourcentage de progression (pas de verrouillage au niveau bloc).
import {ref, computed, onMounted} from 'vue'
import {blockService} from '@/services/blockService'
import {progressService} from '@/services/progressService'
import Icon from '@/components/Icon.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import StatusChip from '@/components/StatusChip.vue'
import BlockCover from '@/components/BlockCover.vue'
import {mediaUrl} from '@/utils/media'
import Breadcrumb from '@/components/Breadcrumb.vue'

const loading = ref(true)
const error = ref('')
const blocks = ref([])

// En l'absence de champ "theme" côté back, on dérive une cover stable depuis l'id.
const COVER_THEMES = ['system', 'network', 'cloud']

function coverTheme(id) {
  return COVER_THEMES[(id - 1) % COVER_THEMES.length]
}

// Statut dérivé de la progression : terminé, en cours, ou à commencer.
function blockStatus(block) {
  const percent = block.summary?.overallPercent
  if (percent == null) {
    return 'unknown'
  }
  if (percent >= 100) {
    return 'done'
  }
  return percent > 0 ? 'in_progress' : 'todo'
}

function progressOf(block) {
  return Math.round(block.summary?.overallPercent ?? 0)
}

function statusChip(block) {
  const status = blockStatus(block)
  if (status === 'done') {
    return {label: 'Terminé', variant: 'success', icon: 'check_circle'}
  }
  if (status === 'in_progress') {
    return {label: 'En cours', variant: 'primary', icon: 'schedule'}
  }
  return null
}

function actionLabel(block) {
  const status = blockStatus(block)
  if (status === 'done') {
    return 'Revoir'
  }
  if (status === 'in_progress') {
    return 'Continuer'
  }
  if (status === 'todo') {
    return 'Commencer'
  }
  return 'Voir'
}

const filter = ref('all')
const filters = [
  {key: 'all', label: 'Tous'},
  {key: 'in_progress', label: 'En cours'},
  {key: 'done', label: 'Terminés'}
]
const filtered = computed(() => {
  if (filter.value === 'all') {
    return blocks.value
  }
  return blocks.value.filter((block) => blockStatus(block) === filter.value)
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    // La progression peut être vide (ex : formateur non inscrit) : on tolère l'absence.
    const [page, summaries] = await Promise.all([
      blockService.getBlocks({size: 100}),
      progressService.getMyBlocks().catch(() => [])
    ])
    const summaryByBlockId = new Map((summaries || []).map((summary) => [summary.blockId, summary]))
    blocks.value = page.items.map((block) => ({
      ...block,
      summary: summaryByBlockId.get(block.id) || null
    }))
  } catch (err) {
    error.value = err.message || 'Impossible de charger les blocs.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <Breadcrumb :items="[{ label: 'Accueil', to: '/' }, { label: 'Mes blocs' }]"/>

  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
    <h1 class="text-[30px] font-semibold text-navy">Mes blocs de compétences</h1>
    <div class="inline-flex bg-surface rounded-full p-1 shadow-[var(--shadow-card)]">
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

  <!-- Chargement -->
  <div v-if="loading" class="text-[15px] text-muted py-10 text-center">Chargement des blocs...</div>

  <!-- Erreur -->
  <div v-else-if="error" class="text-[15px] text-danger bg-danger/8 rounded-[10px] px-4 py-3">{{ error }}</div>

  <!-- Vide -->
  <div v-else-if="filtered.length === 0" class="text-[15px] text-muted py-10 text-center">Aucun bloc à afficher.</div>

  <!-- Liste -->
  <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
    <RouterLink
        v-for="block in filtered"
        :key="block.id"
        :to="`/blocs/${block.id}`"
        class="bg-surface rounded-2xl shadow-[var(--shadow-card)] overflow-hidden flex flex-col transition-all hover:shadow-md"
    >
      <div class="relative">
        <img v-if="block.cover" :src="mediaUrl(block.cover)" :alt="block.name" class="w-full h-[200px] object-cover"/>
        <BlockCover v-else :theme="coverTheme(block.id)"/>
      </div>
      <div class="p-5 flex flex-col gap-3 flex-1">
        <h3 class="text-[17px] font-semibold text-navy">{{ block.name }}</h3>
        <p class="text-[13px] text-ink-soft line-clamp-2 flex-1">{{ block.description }}</p>

        <div v-if="block.summary" class="flex items-center gap-3 text-[13px] text-ink-soft">
          <span class="flex items-center gap-1"><Icon name="menu_book" :size="16"/> {{ block.summary.totalCourses }} cours</span>
          <span class="text-line">•</span>
          <span class="flex items-center gap-1"><Icon name="terminal" :size="16"/> {{ block.summary.totalExercises }} exercices</span>
        </div>

        <ProgressBar v-if="block.summary" :value="progressOf(block)" show-label/>

        <div class="flex items-center justify-between pt-1">
          <div v-if="statusChip(block)">
            <StatusChip v-bind="statusChip(block)"/>
          </div>
          <span class="h-9 px-4 rounded-[10px] bg-primary text-white text-sm font-semibold flex items-center">
            {{ actionLabel(block) }}
          </span>
        </div>
      </div>
    </RouterLink>
  </div>
</template>
