<script setup>
// Historique des tentatives de quiz de l'apprenant, tous quiz confondus.
// GET /api/progress/me/quizzes renvoie une page de QuizAttemptResponse.
import {computed, onMounted, ref} from 'vue'
import {formatDate} from '@/utils/date'
import {quizService} from '@/services/quizService'
import StatusChip from '@/components/StatusChip.vue'
import Breadcrumb from '@/components/Breadcrumb.vue'

const loading = ref(true)
const error = ref('')
const attempts = ref([])

// Tentatives les plus récentes en premier.
const sortedAttempts = computed(() =>
  [...attempts.value].sort((a, b) => new Date(b.finishedAt || b.startedAt) - new Date(a.finishedAt || a.startedAt))
)

function percent(attempt) {
  return attempt.maxScore ? Math.round((attempt.score / attempt.maxScore) * 100) : 0
}

function duration(attempt) {
  if (!attempt.startedAt || !attempt.finishedAt) {
    return ''
  }
  const start = new Date(attempt.startedAt)
  const end = new Date(attempt.finishedAt)
  const minutes = Math.max(1, Math.round((end - start) / 60000))
  return `${minutes} min`
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const page = await quizService.getMyAttempts()
    attempts.value = page.items
  } catch (err) {
    error.value = err.message || "Impossible de charger l'historique."
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="max-w-[860px] mx-auto">
    <Breadcrumb :items="[{ label: 'Mes quiz', to: '/quiz' }, { label: 'Historique' }]"/>
    <h1 class="text-[30px] font-semibold text-navy mb-6">Historique de mes quiz</h1>

    <div v-if="loading" class="text-[15px] text-muted py-10 text-center">Chargement de l'historique...</div>
    <div v-else-if="error" class="text-[15px] text-danger bg-danger/8 rounded-[10px] px-4 py-3">{{ error }}</div>
    <div v-else-if="sortedAttempts.length === 0" class="text-[15px] text-muted py-10 text-center">Aucune tentative pour
      le moment.
    </div>

    <div v-else class="bg-surface rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
      <table class="w-full text-[14px]">
        <thead>
        <tr class="bg-surface-tint text-[13px] text-ink-soft text-left">
          <th class="px-5 py-2.5 font-medium">Quiz</th>
          <th class="px-5 py-2.5 font-medium">Date</th>
          <th class="px-5 py-2.5 font-medium">Score</th>
          <th class="px-5 py-2.5 font-medium">Durée</th>
          <th class="px-5 py-2.5 font-medium">Statut</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="(t, i) in sortedAttempts" :key="t.id" :class="{ 'border-t border-line-soft': i > 0 }">
          <td class="px-5 py-3 text-ink">{{ t.quizName }}</td>
          <td class="px-5 py-3 text-ink-soft">{{ formatDate(t.finishedAt || t.startedAt) }}</td>
          <td class="px-5 py-3 text-ink font-medium">{{ t.score }}/{{ t.maxScore }} ({{ percent(t) }} %)</td>
          <td class="px-5 py-3 text-ink-soft">{{ duration(t) }}</td>
          <td class="px-5 py-3">
            <StatusChip
              :label="t.passed ? 'Réussi' : 'Échoué'"
              :variant="t.passed ? 'success' : 'danger'"
            />
          </td>
        </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
