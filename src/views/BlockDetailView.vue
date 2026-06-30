<script setup>
// Détail d'un bloc : en-tête (compteurs dérivés des modules, anneau de
// progression depuis le résumé) puis liste des modules présentée en parcours.
// GET /api/blocks/{id} renvoie le bloc et ses modules (locked, completed,
// position, compteurs). GET /api/progress/blocks/{id}/summary donne le pourcentage.
import {computed, onMounted, ref} from 'vue'
import {useRoute} from 'vue-router'
import {blockService} from '@/services/blockService'
import {progressService} from '@/services/progressService'
import Icon from '@/components/Icon.vue'
import ProgressRing from '@/components/ProgressRing.vue'
import StatusChip from '@/components/StatusChip.vue'
import BlockCover from '@/components/BlockCover.vue'
import {mediaUrl} from '@/utils/media'
import Breadcrumb from '@/components/Breadcrumb.vue'

const route = useRoute()
const loading = ref(true)
const error = ref('')
const block = ref(null)
const summary = ref(null)

// Modules triés par position.
const sortedModules = computed(() =>
  [...(block.value?.modules || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
)

// Compteurs de l'en-tête dérivés des modules du bloc.
const totals = computed(() => {
  const mods = block.value?.modules || []
  return {
    modules: mods.length,
    courses: mods.reduce((sum, m) => sum + (m.courseCount || 0), 0),
    exercises: mods.reduce((sum, m) => sum + (m.exerciseCount || 0), 0),
    quizzes: mods.filter((m) => m.hasQuiz).length
  }
})

const hasProgress = computed(() => summary.value != null)
const percent = computed(() => Math.round(summary.value?.overallPercent ?? 0))

function moduleState(module) {
  if (module.locked) {
    return 'locked'
  }
  return module.completed ? 'done' : 'open'
}

async function load() {
  loading.value = true
  error.value = ''
  const id = Number(route.params.id)
  try {
    block.value = await blockService.getBlock(id)
    // Le résumé peut ne pas exister (ex : formateur) : on tolère l'absence.
    summary.value = await progressService.getBlockSummary(id).catch(() => null)
  } catch (err) {
    error.value = err.message || 'Impossible de charger le bloc.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div v-if="loading" class="text-[15px] text-muted py-10 text-center">Chargement du bloc...</div>
  <div v-else-if="error" class="text-[15px] text-danger bg-danger/8 rounded-[10px] px-4 py-3">{{ error }}</div>

  <template v-else-if="block">
    <Breadcrumb :items="[{ label: 'Mes blocs', to: '/blocs' }, { label: block.name }]"/>

    <!-- En-tête du bloc -->
    <div
      class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-6 flex flex-col md:flex-row gap-6 items-start mb-8">
      <div class="w-50 h-30 rounded-xl overflow-hidden shrink-0">
        <img v-if="block.cover" :src="mediaUrl(block.cover)" :alt="block.name" class="w-50 h-30 p-3 object-cover"/>
        <BlockCover v-else :height="96"/>
      </div>
      <div class="flex-1">
        <h1 class="text-[30px] font-semibold text-navy mb-2">{{ block.name }}</h1>
        <p class="text-ink-soft mb-4">{{ block.description }}</p>
        <div class="flex flex-wrap gap-2">
          <StatusChip :label="`${totals.modules} modules`" variant="primary" icon="view_module"/>
          <StatusChip :label="`${totals.courses} cours`" variant="primary" icon="menu_book"/>
          <StatusChip :label="`${totals.exercises} exercices`" variant="primary" icon="terminal"/>
          <StatusChip :label="`${totals.quizzes} quiz`" variant="primary" icon="quiz"/>
        </div>
      </div>
      <div v-if="hasProgress" class="shrink-0">
        <ProgressRing :value="percent" :size="96"/>
      </div>
    </div>

    <!-- Modules -->
    <h2 class="text-[22px] font-semibold text-navy mb-4">Modules</h2>
    <div v-if="sortedModules.length === 0" class="text-[15px] text-muted">Aucun module dans ce bloc.</div>
    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <component
        :is="moduleState(module) === 'locked' ? 'div' : 'RouterLink'"
        v-for="module in sortedModules"
        :key="module.id"
        :to="moduleState(module) === 'locked' ? undefined : `/modules/${module.id}`"
        class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-5 flex flex-col gap-3 transition-all"
        :class="moduleState(module) === 'locked' ? 'opacity-70' : 'hover:shadow-md'"
      >
        <!-- En-tête : pastille de position + titre + statut -->
        <div class="flex items-start gap-3">
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold shrink-0"
            :class="moduleState(module) === 'done' ? 'bg-[#16a34a]' : 'bg-primary'"
          >
            <Icon v-if="moduleState(module) === 'done'" name="check" :size="20"/>
            <span v-else>{{ module.position }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-[17px] font-semibold text-ink">{{ module.name }}</h3>
            <p class="text-[13px] text-ink-soft">{{ module.description }}</p>
          </div>
          <StatusChip v-if="moduleState(module) === 'done'" label="Terminé" variant="success" icon="check_circle"/>
        </div>

        <!-- Chips -->
        <div class="flex flex-wrap gap-2">
          <StatusChip :label="`${module.courseCount} cours`" variant="primary"/>
          <StatusChip :label="`${module.exerciseCount} exercices`" variant="primary"/>
          <StatusChip v-if="module.hasQuiz" label="1 quiz" variant="primary"/>
        </div>

        <!-- Pied : action ou verrou -->
        <div class="flex justify-end pt-1">
          <span v-if="moduleState(module) === 'locked'" class="text-[13px] text-muted flex items-center gap-1">
            <Icon name="lock" :size="16"/> Verrouillé
          </span>
          <span v-else-if="moduleState(module) === 'open'"
                class="h-9 px-4 rounded-[10px] bg-primary text-white text-sm font-semibold flex items-center">
            Continuer
          </span>
        </div>
      </component>
    </div>
  </template>
</template>
