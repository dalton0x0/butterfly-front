<script setup>
// Mes quiz : liste des quiz visibles avec leur état (tenté, réussi, meilleur
// score). Chaque carte mène au passage du quiz. GET /api/users/me/quizzes.
import {ref, computed, onMounted} from 'vue'
import {quizService} from '@/services/quizService'
import Icon from '@/components/Icon.vue'
import StatusChip from '@/components/StatusChip.vue'
import Breadcrumb from '@/components/Breadcrumb.vue'

const loading = ref(true)
const error = ref('')
const quizzes = ref([])

function statusChip(quiz) {
  if (quiz.passed) {
    return {label: 'Réussi', variant: 'success', icon: 'check_circle'}
  }
  if (quiz.attempted) {
    return {label: 'À retenter', variant: 'warning', icon: 'schedule'}
  }
  return {label: 'À faire', variant: 'neutral', icon: 'radio_button_unchecked'}
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const page = await quizService.getMyQuizzes()
    quizzes.value = page.items
  } catch (err) {
    error.value = err.message || 'Impossible de charger les quiz.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <Breadcrumb :items="[{ label: 'Accueil', to: '/' }, { label: 'Mes quiz' }]"/>

  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
    <h1 class="text-[30px] font-semibold text-navy">Mes quiz</h1>
    <RouterLink to="/quiz/resultats" class="text-sm text-primary font-semibold hover:underline self-start sm:self-auto">
      Voir l'historique des tentatives
    </RouterLink>
  </div>

  <div v-if="loading" class="text-[15px] text-muted py-10 text-center">Chargement des quiz...</div>
  <div v-else-if="error" class="text-[15px] text-danger bg-danger/8 rounded-[10px] px-4 py-3">{{ error }}</div>
  <div v-else-if="quizzes.length === 0" class="text-[15px] text-muted py-10 text-center">Aucun quiz à afficher.</div>

  <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <RouterLink
        v-for="quiz in quizzes"
        :key="quiz.id"
        :to="`/quiz/${quiz.id}`"
        class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-5 flex items-center gap-4 hover:shadow-md transition-shadow"
    >
      <div class="w-11 h-11 rounded-xl bg-surface-tint flex items-center justify-center text-primary shrink-0">
        <Icon name="quiz" :size="22"/>
      </div>
      <div class="flex-1 min-w-0">
        <span class="text-[15px] font-medium text-ink block truncate">{{ quiz.name }}</span>
        <span class="text-[13px] text-muted">
          {{ quiz.moduleName }}
          <template v-if="quiz.attempted"> &bull; Meilleur score : {{ quiz.bestScore }}/{{ quiz.maxScore }}</template>
        </span>
      </div>
      <StatusChip v-bind="statusChip(quiz)"/>
      <span class="h-9 px-4 rounded-[10px] bg-primary text-white text-sm font-semibold flex items-center shrink-0">
        {{ quiz.attempted ? 'Rejouer' : 'Commencer' }}
      </span>
    </RouterLink>
  </div>
</template>
