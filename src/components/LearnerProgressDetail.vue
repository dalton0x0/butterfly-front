<script setup>
// Détail de progression d'un apprenant, en trois onglets : cours, exercices et quiz.
// Complète l'aperçu, qui ne porte que les dernières activités.
// GET /api/progress/users/{id}/courses et /quizzes, réservés au staff en lecture seule.
// Les exercices passent par GET /api/progress/exercises?userId=, déjà utilisé par la
// file de correction. Attention : contrairement aux deux autres, cet endpoint restreint
// un formateur aux exercices de ses propres blocs.
import {computed, onMounted, ref} from 'vue'
import {formatDate} from '@/utils/date'
import {userService} from '@/services/userService'
import {correctionService} from '@/services/correctionService'
import Icon from './Icon.vue'
import StatusChip from './StatusChip.vue'

const props = defineProps({
  userId: {type: Number, required: true}
})

// Taille alignée sur le reste du front : une liste complète, sans pagination visuelle.
// Le plafond du serveur est à 100, la valeur reste donc dans les clous.
const PAGE_SIZE = 50

const TABS = [
  {key: 'courses', label: 'Cours'},
  {key: 'exercises', label: 'Exercices'},
  {key: 'quizzes', label: 'Quiz'}
]

const tab = ref('courses')
const loading = ref(true)
const error = ref('')
const forbidden = ref(false)
const courses = ref(null)
const exercises = ref(null)
const quizzes = ref(null)

// Une progression de cours n'existe qu'à partir du moment où l'apprenant a terminé
// le cours : il n'y a pas d'avancement partiel. Les deux autres états sont conservés
// comme repli d'affichage, ils ne devraient plus apparaître.
const COURSE_STATUS = {
  COMPLETED: {label: 'Terminé', variant: 'success'},
  IN_PROGRESS: {label: 'En cours', variant: 'primary'},
  NOT_STARTED: {label: 'Non commencé', variant: 'neutral'}
}

function courseStatus(status) {
  return COURSE_STATUS[status] || {label: status || 'Inconnu', variant: 'neutral'}
}

// Libellés repris de la file de correction, pour que le même statut se lise pareil
// d'un écran à l'autre. NOT_STARTED et IN_PROGRESS n'y figuraient pas : la file ne
// montre que les exercices déjà rendus.
const EXERCISE_STATUS = {
  VALIDATED: {label: 'Validé', variant: 'success'},
  SUBMITTED: {label: 'En attente', variant: 'warning'},
  REJECTED: {label: 'Rejeté', variant: 'danger'},
  IN_PROGRESS: {label: 'En cours', variant: 'primary'},
  NOT_STARTED: {label: 'Non commencé', variant: 'neutral'}
}

function exerciseStatus(status) {
  return EXERCISE_STATUS[status] || {label: status || 'Inconnu', variant: 'neutral'}
}

// Une tentative abandonnée n'a pas été corrigée : afficher son score n'aurait aucun sens.
function quizStatus(attempt) {
  if (attempt.abandoned) {
    return {label: 'Abandonné', variant: 'warning'}
  }
  return attempt.passed
      ? {label: 'Réussi', variant: 'success'}
      : {label: 'Échoué', variant: 'danger'}
}

async function load() {
  loading.value = true
  error.value = ''
  forbidden.value = false
  try {
    const [coursePage, exercisePage, quizPage] = await Promise.all([
      userService.getUserCourseProgress(props.userId, {size: PAGE_SIZE}),
      correctionService.listProgress({userId: props.userId}, {size: PAGE_SIZE}),
      userService.getUserQuizAttempts(props.userId, {size: PAGE_SIZE})
    ])
    courses.value = coursePage
    exercises.value = exercisePage
    quizzes.value = quizPage
  } catch (err) {
    // Refus de portée : le composant s'efface au lieu d'afficher une erreur rouge,
    // la vue parente portant déjà l'explication.
    if (err?.isForbidden) {
      forbidden.value = true
    } else {
      error.value = err.message || 'Impossible de charger le détail de progression.'
    }
  } finally {
    loading.value = false
  }
}

// Page de l'onglet actif, pour le compteur et la mention de troncature.
const pages = computed(() => ({
  courses: courses.value,
  exercises: exercises.value,
  quizzes: quizzes.value
}))

const currentPage = computed(() => pages.value[tab.value])

onMounted(load)
</script>

<template>
  <!-- Refus de portée : le bloc disparaît entièrement. La vue parente affiche déjà
       l'explication, la répéter ici encombrerait l'écran sans rien apprendre. -->
  <div v-if="!forbidden" class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-5">
    <div class="flex items-center gap-2 mb-4" role="tablist">
      <button
        v-for="t in TABS"
        :key="t.key"
        type="button"
        role="tab"
        :aria-selected="tab === t.key"
        class="px-4 py-1.5 rounded-full text-[14px] font-medium transition-colors"
        :class="tab === t.key ? 'bg-primary text-white' : 'bg-surface-tint text-ink-soft hover:text-ink'"
        @click="tab = t.key"
      >
        {{ t.label }}
        <span v-if="pages[t.key]" class="tabular-nums">({{ pages[t.key].totalElements }})</span>
      </button>
    </div>

    <p v-if="loading" class="text-[14px] text-muted py-6 text-center">Chargement du détail...</p>
    <p v-else-if="error" class="text-[14px] text-danger bg-danger/8 rounded-[10px] px-3 py-2">{{ error }}</p>

    <template v-else>
      <!-- Progressions de cours -->
      <div v-if="tab === 'courses'" role="tabpanel">
        <p v-if="courses.items.length === 0" class="text-[14px] text-muted py-4">
          Aucun cours terminé.
        </p>
        <ul v-else>
          <li
            v-for="(item, i) in courses.items"
            :key="item.id"
            class="py-3"
            :class="{ 'border-t border-line-soft': i > 0 }"
          >
            <div class="flex items-center gap-3 mb-2">
              <div class="w-8 h-8 rounded-full bg-surface-tint flex items-center justify-center text-primary shrink-0">
                <Icon name="menu_book" :size="18"/>
              </div>
              <span class="text-[15px] text-ink flex-1 truncate">{{ item.courseName }}</span>
              <StatusChip :label="courseStatus(item.status).label" :variant="courseStatus(item.status).variant"/>
              <span class="text-[13px] text-muted shrink-0 w-24 text-right">
                {{ formatDate(item.completedAt || item.updatedAt || item.startedAt, {fallback: '-'}) }}
              </span>
            </div>
          </li>
        </ul>
      </div>

      <!-- Progressions d'exercices -->
      <div v-else-if="tab === 'exercises'" role="tabpanel">
        <p v-if="exercises.items.length === 0" class="text-[14px] text-muted py-4">
          Aucune progression d'exercice enregistrée.
        </p>
        <ul v-else>
          <li
            v-for="(item, i) in exercises.items"
            :key="item.id"
            class="flex items-center gap-3 py-2.5"
            :class="{ 'border-t border-line-soft': i > 0 }"
          >
            <div class="w-8 h-8 rounded-full bg-surface-tint flex items-center justify-center text-primary shrink-0">
              <Icon name="terminal" :size="18"/>
            </div>
            <span class="text-[15px] text-ink flex-1 truncate">{{ item.exerciseName }}</span>
            <span v-if="item.grade != null" class="text-[14px] text-ink-soft tabular-nums shrink-0">
              {{ item.grade }}/20
            </span>
            <StatusChip :label="exerciseStatus(item.status).label" :variant="exerciseStatus(item.status).variant"/>
            <span class="text-[13px] text-muted shrink-0 w-24 text-right">
              {{ formatDate(item.validatedAt || item.submittedAt || item.updatedAt, {fallback: '-'}) }}
            </span>
          </li>
        </ul>
      </div>

      <!-- Tentatives de quiz -->
      <div v-else role="tabpanel">
        <p v-if="quizzes.items.length === 0" class="text-[14px] text-muted py-4">
          Aucune tentative de quiz enregistrée.
        </p>
        <ul v-else>
          <li
            v-for="(item, i) in quizzes.items"
            :key="item.id"
            class="flex items-center gap-3 py-2.5"
            :class="{ 'border-t border-line-soft': i > 0 }"
          >
            <div class="w-8 h-8 rounded-full bg-surface-tint flex items-center justify-center text-primary shrink-0">
              <Icon name="quiz" :size="18"/>
            </div>
            <span class="text-[15px] text-ink flex-1 truncate">{{ item.quizName }}</span>
            <span v-if="!item.abandoned" class="text-[14px] text-ink-soft tabular-nums shrink-0">
              {{ item.score }}/{{ item.maxScore }}
            </span>
            <StatusChip :label="quizStatus(item).label" :variant="quizStatus(item).variant"/>
            <span class="text-[13px] text-muted shrink-0 w-24 text-right">
              {{ formatDate(item.finishedAt || item.startedAt, {fallback: '-'}) }}
            </span>
          </li>
        </ul>
      </div>

      <p v-if="currentPage.totalElements > PAGE_SIZE" class="text-[13px] text-muted mt-3">
        {{ PAGE_SIZE }} entrées les plus récentes affichées sur {{ currentPage.totalElements }}.
      </p>
    </template>
  </div>
</template>
