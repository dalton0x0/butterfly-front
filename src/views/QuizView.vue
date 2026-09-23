<script setup>
// Passation d'un quiz pilotée par le serveur puis résultat.
//
// Le quiz valide un module : le client ne détient jamais plus que la question en cours.
// GET /api/progress/quizzes/{id}/intro décrit le quiz sans livrer de question
// POST /api/progress/quizzes/{id}/start ouvre la tentative et envoie la première
// GET /api/progress/attempts/{id}/current reprend après un rechargement
// POST /api/progress/attempts/{id}/answers verrouille la réponse et envoie la suivante
// POST /api/progress/attempts/{id}/finish clôt la tentative et renvoie le résultat
//
// Le temps est mesuré par le serveur. Le compte à rebours affiché part du temps restant
// qu'il annonce : il informe l'apprenant, il ne décide de rien.
import {computed, onMounted, onUnmounted, reactive, ref} from 'vue'
import {useAsyncTask} from '@/composables/useAsyncTask'
import {onBeforeRouteLeave, useRoute} from 'vue-router'
import {quizService} from '@/services/quizService'
import {formatDate} from '@/utils/date'
import Icon from '@/components/Icon.vue'
import StatusChip from '@/components/StatusChip.vue'
import Modal from '@/components/Modal.vue'
import ProgressRing from '@/components/ProgressRing.vue'

const route = useRoute()
const quizId = Number(route.params.id)

const {loading, error, run} = useAsyncTask('Impossible de charger le quiz.', {loadingFromStart: true})

// Écran d'introduction
const intro = ref(null)
const starting = ref(false)
const startError = ref('')

// Passation en cours
const attemptId = ref(null)
const state = ref(null)
const previousAttemptCounted = ref(false)
const selection = ref([])
const sending = ref(false)
const sendError = ref('')

// Questions déjà servies, mémorisées pour l'écran de correction : le serveur ne renvoie
// que des identifiants dans le résultat et le client n'a plus la liste des questions.
const servedQuestions = reactive({})

const result = ref(null)

const current = computed(() => state.value?.question || null)
const isLast = computed(() => state.value && state.value.questionIndex === state.value.questionCount - 1)
const attemptInProgress = computed(() => Boolean(attemptId.value) && !result.value)

// Minuteur d'affichage
const remaining = ref(0)
let timerId = null

const timerLabel = computed(() => {
  const seconds = Math.max(0, remaining.value)
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
})
const timerLow = computed(() => remaining.value <= 5)

function clearTimer() {
  if (timerId !== null) {
    clearInterval(timerId)
    timerId = null
  }
}

/**
 * Lance le compte à rebours sur le temps restant annoncé par le serveur.
 * À zéro, la réponse part telle quelle : le serveur l'accepte si elle arrive dans sa
 * marge sinon la question est expirée de son côté et vaut zéro.
 */
function startTimer() {
  clearTimer()
  remaining.value = Math.max(0, state.value?.remainingSeconds ?? 0)
  timerId = setInterval(() => {
    remaining.value -= 1
    if (remaining.value <= 0) {
      clearTimer()
      sendAnswer()
    }
  }, 1000)
}

// Sélection des réponses limitée à la question en cours
function isSelected(optionId) {
  return selection.value.includes(optionId)
}

function chooseOption(optionId) {
  if (current.value.type === 'MULTIPLE_CHOICE') {
    selection.value = isSelected(optionId)
        ? selection.value.filter((id) => id !== optionId)
        : [...selection.value, optionId]
  } else {
    selection.value = [optionId]
  }
}

// Le navigateur impose son propre dialogue sur la fermeture d'onglet ou le
// rafraîchissement. On ne peut ni le styliser ni en changer le texte.
function onBeforeUnload(event) {
  if (!attemptInProgress.value) {
    return
  }
  event.preventDefault()
  event.returnValue = ''
}

function watchUnload() {
  window.addEventListener('beforeunload', onBeforeUnload)
}

function unwatchUnload() {
  window.removeEventListener('beforeunload', onBeforeUnload)
}

/**
 * Applique l'état renvoyé par le serveur : mémorise la question servie, réarme le
 * minuteur et termine la tentative quand il n'y a plus de question.
 */
async function applyState(received) {
  state.value = received
  selection.value = []

  if (received.completed) {
    clearTimer()
    await finish()
    return
  }

  servedQuestions[received.question.id] = received.question
  startTimer()
}

async function begin() {
  startError.value = ''
  starting.value = true
  try {
    const started = await quizService.startAttempt(quizId)
    attemptId.value = started.attemptId
    previousAttemptCounted.value = Boolean(started.previousAttemptCounted)
    watchUnload()
    await applyState(started.state)
  } catch (err) {
    startError.value = err.message || 'Impossible de démarrer le quiz.'
  } finally {
    starting.value = false
  }
}

/**
 * Reprend la tentative laissée ouverte, par exemple après un rechargement.
 * Le temps a continué de courir : le serveur peut renvoyer une question plus avancée,
 * voire une tentative déjà terminée.
 */
async function resume() {
  startError.value = ''
  starting.value = true
  try {
    attemptId.value = intro.value.openAttemptId
    watchUnload()
    await applyState(await quizService.getCurrentState(attemptId.value))
  } catch (err) {
    attemptId.value = null
    unwatchUnload()
    startError.value = err.message || 'Impossible de reprendre la tentative.'
  } finally {
    starting.value = false
  }
}

async function sendAnswer() {
  if (sending.value || !current.value) {
    return
  }
  clearTimer()
  sendError.value = ''
  sending.value = true
  try {
    await applyState(await quizService.answer(attemptId.value, current.value.id, selection.value))
  } catch (err) {
    await handleAttemptError(err, "L'envoi de la réponse a échoué.")
  } finally {
    sending.value = false
  }
}

async function finish() {
  try {
    result.value = await quizService.finish(attemptId.value)
    unwatchUnload()
  } catch (err) {
    await handleAttemptError(err, 'La clôture du quiz a échoué.')
  }
}

/**
 * Une tentative introuvable ou déjà close ne peut plus compter : on ramène l'apprenant à
 * l'introduction avec l'explication plutôt que de le laisser sur un écran sans issue.
 */
async function handleAttemptError(err, fallback) {
  if (err.status === 404 || err.status === 409) {
    const message = err.status === 404
        ? "Cette tentative n'est plus valable, le quiz a sans doute été relancé ailleurs. Vous pouvez en commencer une nouvelle."
        : err.message
    await backToIntro()
    startError.value = message
    return
  }
  sendError.value = err.message || fallback
}

async function backToIntro() {
  clearTimer()
  unwatchUnload()
  attemptId.value = null
  state.value = null
  result.value = null
  selection.value = []
  previousAttemptCounted.value = false
  for (const key of Object.keys(servedQuestions)) {
    delete servedQuestions[key]
  }
  intro.value = await quizService.getIntro(quizId)
}

// Recommencer ramène à l'introduction : le bilan est mis à jour et le chronomètre ne
// repart que sur une action explicite de l'apprenant.
async function restart() {
  sendError.value = ''
  try {
    await backToIntro()
  } catch (err) {
    sendError.value = err.message || "Impossible de revenir à l'introduction."
  }
}

// Garde de sortie
const showLeaveModal = ref(false)
const leaving = ref(false)
let pendingLeave = null

async function confirmLeave() {
  leaving.value = true
  clearTimer()
  try {
    await quizService.abandonAttempt(quizId)
  } catch {
    // Une clôture qui échoue ne doit pas bloquer la navigation. La tentative restera
    // ouverte et sera comptée au prochain démarrage.
  }
  unwatchUnload()
  showLeaveModal.value = false
  const proceed = pendingLeave
  pendingLeave = null
  if (proceed) {
    proceed()
  }
}

function cancelLeave() {
  showLeaveModal.value = false
  pendingLeave = null
}

onBeforeRouteLeave((to, from, next) => {
  if (!attemptInProgress.value || leaving.value) {
    next()
    return
  }
  pendingLeave = () => next()
  showLeaveModal.value = true
})

// Écran d'introduction : durée lisible, bilan et ce qui sera montré
function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Number(totalSeconds) || 0)
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  if (minutes === 0) {
    return `${rest} s`
  }
  return rest === 0 ? `${minutes} min` : `${minutes} min ${rest} s`
}

const introFacts = computed(() => {
  const quiz = intro.value
  if (!quiz) {
    return []
  }
  return [
    {label: 'Questions', value: quiz.questionCount},
    {label: 'Durée totale', value: formatDuration(quiz.totalDurationSeconds)},
    {label: 'Seuil de réussite', value: `${quiz.passThresholdPercent} %`},
    {label: 'Mes tentatives', value: quiz.attemptCount},
    {label: 'Meilleur score', value: quiz.bestScore == null ? 'Aucun' : `${quiz.bestScore} / ${quiz.bestMaxScore}`}
  ]
})

const FAILURE_FEEDBACK_LABELS = {
  SCORE: 'En cas d\'échec, vous verrez votre score sans le détail des questions.',
  SCORE_AND_MISSED: 'En cas d\'échec, vous verrez votre score et les questions ratées sans les bonnes réponses.',
  VERDICT_ONLY: 'En cas d\'échec, seul le résultat vous sera indiqué sans le score.'
}

const feedbackNotice = computed(() => FAILURE_FEEDBACK_LABELS[intro.value?.feedbackMode] || '')

const correctionNotice = computed(() => intro.value?.showCorrectionOnPass === false
    ? 'En cas de réussite, votre score vous sera indiqué sans la correction détaillée.'
    : 'En cas de réussite, votre score et la correction complète vous seront montrés.')

// Un délai d'attente court après un échec : le démarrage reste fermé jusque là.
const retryBlocked = computed(() => Boolean(intro.value?.retryAvailableAt))

// Rendu du résultat
const resultTitle = computed(() => result.value?.passed ? 'Félicitations, quiz réussi !' : 'Quiz non réussi')
const hasScore = computed(() => result.value?.score != null && result.value?.maxScore != null)
const percent = computed(() => hasScore.value && result.value.maxScore > 0
    ? Math.round((result.value.score / result.value.maxScore) * 100)
    : 0)

function questionStatement(questionId) {
  return servedQuestions[questionId]?.statement || 'Question non affichée'
}

function optionTexts(questionId, ids) {
  const question = servedQuestions[questionId]
  if (!question || !ids || ids.length === 0) {
    return ''
  }
  return question.options
      .filter((option) => ids.includes(option.id))
      .map((option) => option.text)
      .join(', ')
}

function load() {
  return run(async () => {
    // L'introduction ne contient aucune question : ouvrir la page ne déclenche rien,
    // le chronomètre ne part qu'au clic sur « Commencer ».
    intro.value = await quizService.getIntro(quizId)
  })
}

onMounted(load)
onUnmounted(() => {
  clearTimer()
  unwatchUnload()
})
</script>

<template>
  <div v-if="loading" class="text-[15px] text-muted py-10 text-center">Chargement du quiz...</div>
  <div v-else-if="error" class="text-[15px] text-danger bg-danger/8 rounded-[10px] px-4 py-3">{{ error }}</div>

  <!-- Résultat -->
  <div v-else-if="result" class="max-w-[760px] mx-auto flex flex-col gap-6">
    <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-8 flex flex-col items-center text-center gap-4">
      <ProgressRing v-if="hasScore" :value="percent" :size="120" :stroke="10"/>
      <h2 class="text-[22px] font-semibold text-navy">{{ resultTitle }}</h2>
      <p v-if="hasScore" class="text-ink-soft">Score : {{ result.score }} / {{ result.maxScore }}</p>
      <p v-else class="text-[14px] text-muted max-w-[520px]">
        Le formateur a choisi de ne pas afficher le score pour ce quiz.
      </p>

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
      <p class="text-[13px] text-muted">Recommencer vous ramène à l'introduction. Le chronomètre ne repart qu'à votre clic.</p>
      <p v-if="sendError" class="text-[13px] text-danger">{{ sendError }}</p>
    </div>

    <!-- Détail des réponses, seulement si le quiz l'autorise -->
    <div v-if="result.results" class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-5">
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
            <p class="text-[15px] text-ink">{{ questionStatement(r.questionId) }}</p>
            <p class="text-[13px] text-muted mt-0.5">{{ r.earnedPoints }} / {{ r.maxPoints }} point(s)</p>
            <div v-if="!r.correct" class="flex flex-wrap gap-2 mt-2">
              <span class="text-[13px] px-2 py-1 rounded bg-danger/10 text-danger">
                Votre réponse : {{ optionTexts(r.questionId, r.selectedOptionIds) || 'aucune' }}
              </span>
              <!-- Les bonnes réponses ne sont montrées que si le serveur les a renvoyées -->
              <span v-if="r.correctOptionIds" class="text-[13px] px-2 py-1 rounded bg-[#16a34a]/12 text-[#16a34a]">
                Bonne réponse : {{ optionTexts(r.questionId, r.correctOptionIds) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Introduction : rien ne démarre avant le clic -->
  <div v-else-if="intro && !attemptId" class="max-w-[760px] mx-auto flex flex-col gap-6">
    <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-8 flex flex-col gap-6">
      <div class="flex items-center gap-3 flex-wrap">
        <h2 class="text-[22px] font-semibold text-navy">{{ intro.name }}</h2>
        <StatusChip v-if="intro.alreadyPassed" label="Déjà réussi" variant="success"/>
      </div>

      <div v-if="intro.content" class="rounded-xl bg-surface-tint px-4 py-3">
        <p class="text-[12px] font-semibold text-muted uppercase tracking-wide mb-1">Consigne</p>
        <p class="text-[14px] text-ink whitespace-pre-wrap break-words">{{ intro.content }}</p>
      </div>

      <dl class="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div v-for="fact in introFacts" :key="fact.label" class="rounded-xl bg-background px-4 py-3">
          <dt class="text-[12px] text-muted">{{ fact.label }}</dt>
          <dd class="text-[17px] font-semibold text-ink tabular-nums">{{ fact.value }}</dd>
        </div>
      </dl>

      <div class="flex flex-col gap-1.5 text-[13px] text-muted">
        <p>
          Les questions arrivent une par une, chacune avec son propre temps. Une réponse
          envoyée est définitive et une question dont le temps est écoulé ne compte pas.
        </p>
        <p>{{ feedbackNotice }}</p>
        <p>{{ correctionNotice }}</p>
      </div>

      <p v-if="retryBlocked"
         class="text-[14px] text-ink bg-warning/10 rounded-[10px] px-4 py-3">
        Une nouvelle tentative sera possible à partir du {{ formatDate(intro.retryAvailableAt) }}.
      </p>

      <p v-if="startError" class="text-[14px] text-danger bg-danger/8 rounded-[10px] px-4 py-3">{{ startError }}</p>

      <div class="flex gap-3 flex-wrap">
        <RouterLink to="/quiz"
                    class="h-10 px-5 rounded-[10px] bg-surface border border-input text-primary text-sm font-semibold flex items-center hover:bg-surface-hover transition-colors">
          Revenir à mes quiz
        </RouterLink>
        <button v-if="intro.openAttemptId"
                type="button"
                :disabled="starting"
                class="h-10 px-5 rounded-[10px] bg-primary text-white text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
                @click="resume">
          <Icon name="play_arrow" :size="18"/>
          {{ starting ? 'Reprise...' : 'Reprendre la tentative en cours' }}
        </button>
        <button v-else
                type="button"
                :disabled="starting || retryBlocked"
                class="h-10 px-5 rounded-[10px] bg-primary text-white text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
                @click="begin">
          <Icon name="play_arrow" :size="18"/>
          {{ starting ? 'Démarrage...' : 'Commencer' }}
        </button>
      </div>
    </div>
  </div>

  <!-- Passation -->
  <div v-else-if="current" class="max-w-[760px] mx-auto flex flex-col gap-6">
    <div v-if="previousAttemptCounted"
         class="flex items-start gap-3 bg-warning/10 text-ink rounded-[10px] px-4 py-3">
      <Icon name="warning" :size="20" class="text-warning shrink-0 mt-0.5"/>
      <p class="text-[14px]">
        Une tentative précédente sur ce quiz avait été quittée sans être terminée.
        Elle a été comptée comme un échec.
      </p>
    </div>

    <!-- Carte de statut -->
    <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-6 flex flex-col gap-4">
      <h3 class="text-[17px] font-semibold text-ink">{{ intro.name }}</h3>

      <div v-if="intro.content" class="rounded-xl bg-surface-tint px-4 py-3">
        <p class="text-[12px] font-semibold text-muted uppercase tracking-wide mb-1">Consigne</p>
        <p class="text-[14px] text-ink whitespace-pre-wrap break-words">{{ intro.content }}</p>
      </div>

      <div class="flex flex-col gap-2">
        <span class="text-[13px] text-muted">
          Question {{ state.questionIndex + 1 }} / {{ state.questionCount }}
        </span>
        <div class="flex gap-1 h-2">
          <div
            v-for="position in state.questionCount"
            :key="position"
            class="flex-1 rounded-full transition-colors"
            :class="position - 1 < state.questionIndex ? 'bg-primary' : (position - 1 === state.questionIndex ? 'bg-accent' : 'bg-[#e2e8f0]')"
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
          :class="isSelected(option.id) ? 'bg-accent/15' : 'bg-background hover:bg-surface-tint'"
          @click="chooseOption(option.id)"
        >
          <span
            class="w-5 h-5 flex items-center justify-center shrink-0 border-2"
            :class="[
              current.type === 'MULTIPLE_CHOICE' ? 'rounded' : 'rounded-full',
              isSelected(option.id) ? 'border-primary' : 'border-input'
            ]"
          >
            <span
              v-if="isSelected(option.id)"
              :class="current.type === 'MULTIPLE_CHOICE' ? 'w-3 h-3 rounded-[2px] bg-primary' : 'w-2.5 h-2.5 rounded-full bg-primary'"
            ></span>
          </span>
          <span class="text-[15px]" :class="isSelected(option.id) ? 'font-semibold text-ink' : 'text-ink'">{{
              option.text
            }}</span>
        </button>
      </div>
    </div>

    <p v-if="sendError" class="text-[13px] text-danger">{{ sendError }}</p>

    <!-- Contrôles -->
    <div class="flex items-center justify-between gap-3">
      <span class="text-[13px] text-muted max-w-[55%]">
        Votre réponse est définitive : on ne revient pas à une question déjà validée.
      </span>
      <button
        type="button"
        :disabled="sending"
        class="h-10 px-6 rounded-[10px] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
        :class="isLast ? 'bg-[#16a34a]' : 'bg-primary'"
        @click="sendAnswer"
      >
        {{ sending ? 'Envoi...' : (isLast ? 'Terminer le quiz' : 'Valider et continuer') }}
      </button>
    </div>
  </div>

  <!-- Confirmation de sortie en cours de passation -->
  <Modal v-if="showLeaveModal" @close="cancelLeave">
    <div class="px-6 pt-6 pb-6 w-full max-w-[420px] text-center">
      <div class="w-12 h-12 rounded-full bg-warning/12 text-warning flex items-center justify-center mx-auto mb-4">
        <Icon name="warning" :size="26"/>
      </div>
      <h3 class="text-[18px] font-semibold text-navy mb-2">Quitter le quiz ?</h3>
      <p class="text-[14px] text-ink-soft mb-4">
        Cette tentative sera enregistrée comme un échec. Vos réponses déjà validées restent
        enregistrées, mais les questions suivantes seront comptées comme non répondues.
      </p>
      <div class="flex justify-center gap-3">
        <button type="button" :disabled="leaving"
                class="h-10 px-4 rounded-[10px] border border-input text-ink text-sm font-semibold hover:bg-surface-tint transition-colors disabled:opacity-60"
                @click="cancelLeave">
          Continuer le quiz
        </button>
        <button type="button" :disabled="leaving"
                class="h-10 px-5 rounded-[10px] bg-danger text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
                @click="confirmLeave">
          {{ leaving ? 'Sortie...' : 'Quitter quand même' }}
        </button>
      </div>
    </div>
  </Modal>
</template>
