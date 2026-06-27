<script setup>
// Passage d'un quiz puis résultat corrigé sur la même page.
// GET /api/quizzes/{id}/play (sans les bonnes réponses), navigation question par
// question, puis POST /api/progress/quizzes/{id}/submit. Le serveur calcule
// le score et la réussite. Le résultat renvoie la correction par question.
import {computed, onMounted, onUnmounted, reactive, ref, watch} from 'vue'
import {useRoute} from 'vue-router'
import {quizService} from '@/services/quizService'
import Icon from '@/components/Icon.vue'
import ProgressRing from '@/components/ProgressRing.vue'

const route = useRoute()

const loading = ref(true)
const error = ref('')
const quiz = ref(null)
const questions = ref([])

const index = ref(0)
const selections = reactive({}) // questionId -> [optionId]
const submitting = ref(false)
const submitError = ref('')
const result = ref(null)

const current = computed(() => questions.value[index.value] || null)
const isLast = computed(() => index.value === questions.value.length - 1)

// Minuteur par question
const DEFAULT_QUESTION_TIME = 30
const remaining = ref(0)
let timerId = null

const timerLabel = computed(() => {
  const s = Math.max(0, remaining.value)
  const minutes = Math.floor(s / 60)
  const seconds = s % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

// Les cinq dernières secondes passent en alerte visuelle.
const timerLow = computed(() => remaining.value <= 5)

// Sélection des réponses
function isSelected(questionId, optionId) {
  return (selections[questionId] || []).includes(optionId)
}

function selectSingle(questionId, optionId) {
  selections[questionId] = [optionId]
}

function toggleMultiple(questionId, optionId) {
  const current = selections[questionId] ? [...selections[questionId]] : []
  const i = current.indexOf(optionId)
  if (i >= 0) {
    current.splice(i, 1)
  } else {
    current.push(optionId)
  }
  selections[questionId] = current
}

function chooseOption(question, optionId) {
  if (question.type === 'MULTIPLE_CHOICE') {
    toggleMultiple(question.id, optionId)
  } else {
    selectSingle(question.id, optionId)
  }
}

function clearTimer() {
  if (timerId !== null) {
    clearInterval(timerId)
    timerId = null
  }
}

// Démarre le compte à rebours de la question courante avec sa durée effective.
function startTimer() {
  clearTimer()
  const limit = current.value?.timeLimitSeconds
  remaining.value = (typeof limit === 'number' && limit > 0) ? limit : DEFAULT_QUESTION_TIME
  timerId = setInterval(() => {
    remaining.value -= 1
    if (remaining.value <= 0) {
      clearTimer()
      goNext()
    }
  }, 1000)
}

// Passage forcé à la question suivante (ou soumission si dernière).
// La réponse est figée en l'état : une question laissée sans réponse à l'expiration
// du minuteur reste donc non validée, donc comptée comme fausse au moment du calcul.
function goNext() {
  clearTimer()
  if (isLast.value) {
    submit()
  } else {
    index.value++
  }
}

function segmentClass(i) {
  if (i < index.value) return 'bg-primary'
  if (i === index.value) return 'bg-accent'
  return 'bg-[#e2e8f0]'
}

// Soumission
async function submit() {
  clearTimer()
  submitError.value = ''
  submitting.value = true
  try {
    const answers = questions.value.map((q) => ({
      questionId: q.id,
      selectedOptionIds: selections[q.id] || []
    }))
    result.value = await quizService.submit(quiz.value.id, answers)
  } catch (err) {
    submitError.value = err.message || "L'envoi du quiz a échoué."
  } finally {
    submitting.value = false
  }
}

function restart() {
  for (const key of Object.keys(selections)) {
    delete selections[key]
  }
  index.value = 0
  result.value = null
  submitError.value = ''
  if (current.value) {
    startTimer()
  }
}

// Rendu du résultat
const percent = computed(() => {
  const r = result.value
  return r && r.maxScore ? Math.round((r.score / r.maxScore) * 100) : 0
})
const questionById = computed(() => {
  const map = {}
  for (const q of questions.value) {
    map[q.id] = q
  }
  return map
})

function optionText(questionId, optionId) {
  const question = questionById.value[questionId]
  const option = question?.options.find((o) => o.id === optionId)
  return option ? option.text : ''
}

function optionTexts(questionId, optionIds) {
  return (optionIds || []).map((id) => optionText(questionId, id)).filter(Boolean).join(', ')
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    quiz.value = await quizService.getPlay(Number(route.params.id))
    questions.value = [...(quiz.value.questions || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  } catch (err) {
    error.value = err.message || 'Impossible de charger le quiz.'
  } finally {
    loading.value = false
  }
}

// Redémarre le compte à rebours à chaque changement de question pendant la passation.
watch(current, (question) => {
  if (question && !result.value) {
    startTimer()
  } else {
    clearTimer()
  }
})

onMounted(load)
onUnmounted(clearTimer)
</script>

<template>
  <div v-if="loading" class="text-[15px] text-muted py-10 text-center">Chargement du quiz...</div>
  <div v-else-if="error" class="text-[15px] text-danger bg-danger/8 rounded-[10px] px-4 py-3">{{ error }}</div>

  <!-- Résultat -->
  <div v-else-if="result" class="max-w-[760px] mx-auto flex flex-col gap-6">
    <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-8 flex flex-col items-center text-center gap-4">
      <ProgressRing :value="percent" :size="120" :stroke="10"/>
      <h2 class="text-[22px] font-semibold text-navy">
        {{ result.passed ? 'Félicitations, quiz réussi !' : 'Quiz non réussi' }}
      </h2>
      <p class="text-ink-soft">Score : {{ result.score }} / {{ result.maxScore }}</p>
      <div class="flex gap-3 mt-2">
        <RouterLink to="/quiz"
                    class="h-10 px-5 rounded-[10px] bg-primary text-white text-sm font-semibold flex items-center hover:opacity-90 transition-opacity">
          Revenir à mes quiz
        </RouterLink>
        <button type="button"
                class="h-10 px-5 rounded-[10px] bg-surface border border-input text-primary text-sm font-semibold flex items-center hover:bg-surface-hover transition-colors"
                @click="restart">
          Recommencer
        </button>
      </div>
    </div>

    <!-- Détail des réponses -->
    <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-5">
      <h3 class="text-[17px] font-semibold text-ink mb-4">Détail des réponses</h3>
      <div>
        <div
          v-for="(r, i) in result.results"
          :key="r.questionId"
          class="flex items-start gap-3 py-3"
          :class="{ 'border-t border-line-soft': i > 0 }"
        >
          <div
            class="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
            :class="r.correct ? 'bg-[#16a34a]/12 text-[#16a34a]' : 'bg-danger/10 text-danger'"
          >
            <Icon :name="r.correct ? 'check' : 'close'" :size="18"/>
          </div>
          <div class="flex-1">
            <p class="text-[15px] text-ink">{{ questionById[r.questionId]?.statement }}</p>
            <p class="text-[13px] text-muted mt-0.5">{{ r.earnedPoints }} / {{ r.maxPoints }} point(s)</p>
            <div v-if="!r.correct" class="flex flex-wrap gap-2 mt-2">
              <span class="text-[13px] px-2 py-1 rounded bg-danger/10 text-danger">
                Votre réponse : {{ optionTexts(r.questionId, r.selectedOptionIds) || 'aucune' }}
              </span>
              <span class="text-[13px] px-2 py-1 rounded bg-[#16a34a]/12 text-[#16a34a]">
                Bonne réponse : {{ optionTexts(r.questionId, r.correctOptionIds) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Passage -->
  <div v-else-if="quiz && current" class="max-w-[760px] mx-auto flex flex-col gap-6">
    <!-- Carte de statut -->
    <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-6 flex flex-col gap-4">
      <h3 class="text-[17px] font-semibold text-ink">{{ quiz.name }}</h3>
      <div class="flex flex-col gap-2">
        <span class="text-[13px] text-muted">Question {{ index + 1 }} / {{ questions.length }}</span>
        <div class="flex gap-1 h-2">
          <div
            v-for="(q, i) in questions"
            :key="q.id"
            class="flex-1 rounded-full transition-colors"
            :class="segmentClass(i)"
          ></div>
        </div>
      </div>
    </div>

    <!-- Carte question -->
    <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-8 flex flex-col gap-6">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-[22px] font-semibold text-navy mb-1">{{ current.statement }}</h2>
          <span class="text-[13px] text-muted">
            {{ current.type === 'MULTIPLE_CHOICE' ? 'Plusieurs réponses possibles' : 'Une seule réponse possible' }}
          </span>
        </div>
        <div
          class="flex items-center gap-1.5 px-3 h-9 rounded-full shrink-0 transition-colors"
          :class="timerLow ? 'bg-danger/10 text-danger' : 'bg-surface-tint text-ink-soft'"
          title="Temps restant pour cette question"
        >
          <Icon name="timer" :size="18"/>
          <span class="text-[14px] font-semibold tabular-nums">{{ timerLabel }}</span>
        </div>
      </div>
      <div class="flex flex-col gap-3">
        <button
          v-for="option in current.options"
          :key="option.id"
          type="button"
          class="flex items-center gap-4 p-4 rounded-xl text-left transition-colors"
          :class="isSelected(current.id, option.id) ? 'bg-accent/15' : 'bg-background hover:bg-surface-tint'"
          @click="chooseOption(current, option.id)"
        >
          <span
            class="w-5 h-5 flex items-center justify-center shrink-0 border-2"
            :class="[
              current.type === 'MULTIPLE_CHOICE' ? 'rounded' : 'rounded-full',
              isSelected(current.id, option.id) ? 'border-primary' : 'border-input'
            ]"
          >
            <span
              v-if="isSelected(current.id, option.id)"
              :class="current.type === 'MULTIPLE_CHOICE' ? 'w-3 h-3 rounded-[2px] bg-primary' : 'w-2.5 h-2.5 rounded-full bg-primary'"
            ></span>
          </span>
          <span class="text-[15px]" :class="isSelected(current.id, option.id) ? 'font-semibold text-ink' : 'text-ink'">{{
              option.text
            }}</span>
        </button>
      </div>
    </div>

    <p v-if="submitError" class="text-[13px] text-danger">{{ submitError }}</p>

    <!-- Contrôles -->
    <div class="flex items-center justify-between gap-3">
      <span class="text-[13px] text-muted max-w-[45%]">
        Le temps écoulé passe automatiquement à la question suivante.
      </span>
      <div class="flex gap-2 items-center">
        <span
          v-for="(q, i) in questions"
          :key="q.id"
          class="w-2 h-2 rounded-full transition-all"
          :class="i === index ? 'bg-accent scale-125' : (selections[q.id] && selections[q.id].length) ? 'bg-primary' : 'bg-[#e2e8f0]'"
        ></span>
      </div>
      <button
        type="button"
        :disabled="submitting"
        class="h-10 px-6 rounded-[10px] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
        :class="isLast ? 'bg-[#16a34a]' : 'bg-primary'"
        @click="goNext"
      >
        {{ isLast ? (submitting ? 'Envoi...' : 'Terminer le quiz') : 'Suivant' }}
      </button>
    </div>
  </div>
</template>
