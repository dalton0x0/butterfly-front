<script setup>
// Historique des tentatives de quiz de l'apprenant, tous quiz confondus.
// GET /api/progress/me/quizzes renvoie une page de QuizAttemptResponse.
// Une tentative abandonnée est close sans correction : elle a un score nul qui ne
// reflète aucune réponse, elle est donc distinguée d'un échec au barème.
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

// En mode « verdict seul », le serveur retire le score d'un échec : seul le verdict est montré.
function hasScore(attempt) {
  return attempt.score != null && attempt.maxScore != null
}

function duration(attempt) {
  // Sur un abandon, la clôture peut survenir bien après la sortie réelle :
  // afficher cet écart donnerait une durée fausse.
  if (attempt.abandoned || !attempt.startedAt || !attempt.finishedAt) {
    return ''
  }
  const start = new Date(attempt.startedAt)
  const end = new Date(attempt.finishedAt)
  const minutes = Math.max(1, Math.round((end - start) / 60000))
  return `${minutes} min`
}

function statusLabel(attempt) {
  if (attempt.abandoned) return 'Abandonnée'
  return attempt.passed ? 'Réussi' : 'Échoué'
}

function statusVariant(attempt) {
  if (attempt.abandoned) return 'neutral'
  return attempt.passed ? 'success' : 'danger'
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
          <td class="px-5 py-3 font-medium" :class="t.abandoned ? 'text-muted' : 'text-ink'">
            <span v-if="t.abandoned" title="Quiz quitté avant la fin, aucune réponse corrigée">Non corrigé</span>
            <span v-else-if="!hasScore(t)" class="text-muted"
                  title="Le formateur ne communique que le verdict après un échec">Non communiqué</span>
            <span v-else>{{ t.score }}/{{ t.maxScore }} ({{ percent(t) }} %)</span>
          </td>
          <td class="px-5 py-3 text-ink-soft">{{ duration(t) || '-' }}</td>
          <td class="px-5 py-3">
            <StatusChip
              :label="statusLabel(t)"
              :variant="statusVariant(t)"
              :icon="t.abandoned ? 'logout' : ''"
            />
          </td>
        </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
