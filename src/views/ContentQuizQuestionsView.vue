<script setup>
// Espace formateur : éditeur des questions d'un quiz.
// GET /api/quizzes/{id}/questions charge les questions existantes (avec les
// bonnes réponses). PUT /api/quizzes/{id}/questions remplace l'intégralité des
// questions. Le score sera calculé côté serveur lors du passage par l'apprenant.
import {computed, onMounted, ref} from 'vue'
import {useRoute} from 'vue-router'
import {quizService} from '@/services/quizService'
import Icon from '@/components/Icon.vue'
import Modal from '@/components/Modal.vue'
import Toast from '@/components/Toast.vue'
import Breadcrumb from '@/components/Breadcrumb.vue'
import {IMPORT_TEMPLATE, parseQuestionsFile, validateImportFile} from '@/utils/quizImport'

const route = useRoute()
const quizId = Number(route.params.id)

const loading = ref(true)
const error = ref('')
const saving = ref(false)
const quiz = ref(null)
const questions = ref([])

// Retour d'action affiché en message flottant. La barre d'enregistrement est en bas
// d'une page longue : un bandeau en haut passerait inaperçu.
const toast = ref(null)

function showToast(message, variant = 'success') {
  // Une erreur reste jusqu'à fermeture, le temps de la lire et de corriger.
  toast.value = {message, variant, duration: variant === 'danger' ? 0 : 4000}
}

// Amène la question fautive dans le champ de vision et place le curseur dans son énoncé.
function focusQuestion(index) {
  const el = document.getElementById(`quiz-question-${index}-statement`)
  if (!el) {
    return
  }
  el.scrollIntoView({behavior: 'smooth', block: 'center'})
  el.focus({preventScroll: true})
}

const QUESTION_TYPES = [
  {value: 'SINGLE_CHOICE', label: 'Choix simple'},
  {value: 'MULTIPLE_CHOICE', label: 'Choix multiple'}
]

// Import JSON : le fichier remplit le formulaire, rien n'est envoyé au serveur
// avant que le formateur ait relu et cliqué sur Enregistrer.
const showImport = ref(false)
const importMode = ref('replace')
const importErrors = ref([])
const importFileInput = ref(null)

const breadcrumb = computed(() => {
  const items = [{label: 'Contenus', to: '/formateur/contenus'}]
  if (quiz.value?.moduleId) {
    items.push({label: quiz.value.moduleName || 'Module', to: `/formateur/contenus/modules/${quiz.value.moduleId}`})
  }
  items.push({label: quiz.value?.name || 'Quiz'})
  return items
})

function addQuestion() {
  questions.value.push({
    statement: '',
    type: 'SINGLE_CHOICE',
    points: 1,
    timeLimitSeconds: '',
    options: [
      {text: '', correct: false},
      {text: '', correct: false}
    ]
  })
}

function removeQuestion(index) {
  questions.value.splice(index, 1)
}

function addOption(question) {
  question.options.push({text: '', correct: false})
}

function removeOption(question, index) {
  if (question.options.length > 2) {
    question.options.splice(index, 1)
  }
}

// En choix simple, une seule bonne réponse. En choix multiple, on bascule.
function setCorrect(question, index) {
  if (question.type === 'SINGLE_CHOICE') {
    question.options.forEach((option, i) => {
      option.correct = i === index
    })
  } else {
    question.options[index].correct = !question.options[index].correct
  }
}

function onTypeChange(question) {
  if (question.type === 'SINGLE_CHOICE') {
    const firstCorrect = question.options.findIndex((option) => option.correct)
    question.options.forEach((option, i) => {
      option.correct = i === firstCorrect
    })
  }
}

function openImport() {
  importMode.value = questions.value.length === 0 ? 'append' : 'replace'
  importErrors.value = []
  showImport.value = true
}

function pickImportFile() {
  importFileInput.value?.click()
}

// Propose le modèle en téléchargement, sans passer par le serveur.
function downloadTemplate() {
  const blob = new Blob([IMPORT_TEMPLATE], {type: 'application/json'})
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'modele-questions.json'
  link.click()
  // Sans cette libération, le blob resterait en mémoire jusqu'au rechargement.
  URL.revokeObjectURL(url)
}

async function onImportFileSelected(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  importErrors.value = []

  const fileError = validateImportFile(file)
  if (fileError) {
    importErrors.value = [fileError]
    return
  }

  const {questions: imported, errors} = parseQuestionsFile(await file.text())
  if (errors.length > 0) {
    importErrors.value = errors
    return
  }

  questions.value = importMode.value === 'replace' ? imported : [...questions.value, ...imported]
  showImport.value = false
  showToast(`${imported.length} question(s) importée(s). Relisez puis enregistrez.`)
}

/**
 * Vérifie le nombre de bonnes réponses cochées, selon le type de question.
 */
function validateCorrectAnswers(question, qi) {
  const correctCount = question.options.filter((option) => option.correct).length

  if (question.type === 'SINGLE_CHOICE' && correctCount !== 1) {
    return `Question ${qi + 1} : sélectionnez exactement une bonne réponse.`
  }
  if (question.type === 'MULTIPLE_CHOICE' && correctCount < 1) {
    return `Question ${qi + 1} : sélectionnez au moins une bonne réponse.`
  }
  return ''
}

/**
 * Vérifie les options d'une question : nombre, texte, puis bonnes réponses.
 */
function validateOptions(question, qi) {
  if (question.options.length < 2) {
    return `Question ${qi + 1} : au moins deux options sont requises.`
  }

  for (const [oi, option] of question.options.entries()) {
    if (!option.text.trim()) {
      return `Question ${qi + 1}, option ${oi + 1} : le texte est obligatoire.`
    }
    if (option.text.length > 1000) {
      return `Question ${qi + 1}, option ${oi + 1} : le texte dépasse 1000 caractères.`
    }
  }

  return validateCorrectAnswers(question, qi)
}

/**
 * Vérifie une question : énoncé, points, puis options.
 */
function validateQuestion(question, qi) {
  const statement = question.statement.trim()

  if (!statement) {
    return `Question ${qi + 1} : l'énoncé est obligatoire.`
  }
  if (statement.length > 2000) {
    return `Question ${qi + 1} : l'énoncé dépasse 2000 caractères.`
  }
  if (!question.points || Number(question.points) < 1) {
    return `Question ${qi + 1} : les points doivent être strictement positifs.`
  }

  return validateOptions(question, qi)
}

/**
 * Vérifie l'ensemble des questions et renvoie la première erreur rencontrée,
 * avec le rang de la question concernée pour pouvoir y amener le formateur.
 *
 * @returns {{message: string, index: number}|null} l'erreur, ou null si tout est valide
 */
function validate() {
  for (const [qi, question] of questions.value.entries()) {
    const message = validateQuestion(question, qi)
    if (message) {
      return {message, index: qi}
    }
  }
  return null
}

async function save() {
  toast.value = null
  const validationError = validate()
  if (validationError) {
    showToast(validationError.message, 'danger')
    focusQuestion(validationError.index)
    return
  }
  saving.value = true
  try {
    const payload = questions.value.map((q) => ({
      statement: q.statement.trim(),
      type: q.type,
      points: Number(q.points),
      timeLimitSeconds: q.timeLimitSeconds === '' || q.timeLimitSeconds == null ? null : Number(q.timeLimitSeconds),
      options: q.options.map((o) => ({text: o.text.trim(), correct: Boolean(o.correct)}))
    }))
    await quizService.updateQuestions(quizId, payload)
    showToast('Questions enregistrées avec succès.')
  } catch (err) {
    showToast(err.message || "L'enregistrement a échoué.", 'danger')
  } finally {
    saving.value = false
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [meta, existing] = await Promise.all([
      quizService.getQuiz(quizId),
      quizService.getQuestions(quizId)
    ])
    quiz.value = meta
    questions.value = (existing || [])
      .slice()
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((q) => ({
        statement: q.statement || '',
        type: q.type || 'SINGLE_CHOICE',
        points: q.points ?? 1,
        timeLimitSeconds: q.timeLimitSeconds ?? '',
        options: (q.options || [])
          .slice()
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
          .map((o) => ({text: o.text || '', correct: Boolean(o.correct)}))
      }))
  } catch (err) {
    error.value = err.message || 'Impossible de charger le quiz.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div v-if="loading" class="text-[15px] text-muted py-10 text-center">Chargement du quiz...</div>
  <div v-else-if="error" class="text-[15px] text-danger bg-danger/8 rounded-[10px] px-4 py-3">{{ error }}</div>

  <template v-else>
    <Breadcrumb :items="breadcrumb"/>

    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h1 class="text-[30px] font-semibold text-navy">Questions du quiz</h1>
        <p class="text-ink-soft mt-1">{{ quiz?.name }}</p>
      </div>
      <div class="flex gap-3 self-start">
        <button
          class="h-10 px-4 rounded-[10px] border border-input text-primary text-sm font-semibold flex items-center gap-2 hover:bg-surface-tint transition-colors"
          @click="openImport"
        >
          <Icon name="upload_file" :size="18"/>
          Importer un JSON
        </button>
        <button
          class="h-10 px-4 rounded-[10px] border border-input text-primary text-sm font-semibold flex items-center gap-2 hover:bg-surface-tint transition-colors"
          @click="addQuestion"
        >
          <Icon name="add" :size="18"/>
          Ajouter une question
        </button>
      </div>
    </div>

    <p v-if="questions.length === 0" class="text-[15px] text-muted py-10 text-center">
      Aucune question. Ajoutez-en une pour commencer.
    </p>

    <div v-else class="flex flex-col gap-5">
      <div v-for="(question, qi) in questions" :key="qi" class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-5">
        <div class="flex items-center justify-between mb-4">
          <span class="text-[15px] font-semibold text-navy">Question {{ qi + 1 }}</span>
          <button class="text-muted hover:text-danger transition-colors" aria-label="Supprimer la question"
                  @click="removeQuestion(qi)">
            <Icon name="delete" :size="20"/>
          </button>
        </div>

        <div class="flex flex-col gap-4">
          <div>
            <!-- Identifiants dérivés de l'index de la question : les champs sont produits
                 en boucle, un identifiant fixe créerait autant de doublons que de questions. -->
            <label :for="`quiz-question-${qi}-statement`"
                   class="block text-[13px] font-medium text-ink-soft mb-1.5">Énoncé</label>
            <textarea
              :id="`quiz-question-${qi}-statement`"
              v-model="question.statement"
              rows="2"
              maxlength="2000"
              class="w-full border border-input rounded-[10px] px-3 py-2 text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors resize-none"
            ></textarea>
          </div>

          <div class="flex flex-wrap gap-4">
            <div class="flex-1 min-w-[160px]">
              <label :for="`quiz-question-${qi}-type`"
                     class="block text-[13px] font-medium text-ink-soft mb-1.5">Type</label>
              <select
                :id="`quiz-question-${qi}-type`"
                v-model="question.type"
                class="w-full h-10 px-3 border border-input rounded-[10px] text-[14px] text-ink bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                @change="onTypeChange(question)"
              >
                <option v-for="t in QUESTION_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
              </select>
            </div>
            <div class="w-28">
              <label :for="`quiz-question-${qi}-points`"
                     class="block text-[13px] font-medium text-ink-soft mb-1.5">Points</label>
              <input
                :id="`quiz-question-${qi}-points`"
                v-model="question.points"
                type="number"
                min="1"
                class="w-full h-10 px-3 border border-input rounded-[10px] text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
            <div class="w-40">
              <label :for="`quiz-question-${qi}-duration`"
                     class="block text-[13px] font-medium text-ink-soft mb-1.5">Durée (secondes)</label>
              <input
                :id="`quiz-question-${qi}-duration`"
                v-model="question.timeLimitSeconds"
                type="number"
                min="5"
                max="3600"
                placeholder="défaut"
                class="w-full h-10 px-3 border border-input rounded-[10px] text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <!-- Intitulé de groupe et non étiquette de champ -->
              <p class="block text-[13px] font-medium text-ink-soft">
                Options
                <span class="text-muted font-normal">
                  ({{
                    question.type === 'MULTIPLE_CHOICE' ? 'plusieurs bonnes réponses possibles' : 'une seule bonne réponse'
                  }})
                </span>
              </p>
              <button class="text-primary text-[13px] font-semibold hover:underline flex items-center gap-1"
                      @click="addOption(question)">
                <Icon name="add" :size="16"/>
                Ajouter une option
              </button>
            </div>

            <div class="flex flex-col gap-2">
              <div v-for="(option, oi) in question.options" :key="oi" class="flex items-center gap-3">
                <!-- Indicateur bonne réponse -->
                <button
                  type="button"
                  class="w-6 h-6 flex items-center justify-center border-2 shrink-0 transition-colors"
                  :class="[
                    question.type === 'MULTIPLE_CHOICE' ? 'rounded' : 'rounded-full',
                    option.correct ? 'border-[#16a34a] bg-[#16a34a]/12' : 'border-input'
                  ]"
                  :aria-label="option.correct ? 'Bonne réponse' : 'Marquer comme bonne réponse'"
                  @click="setCorrect(question, oi)"
                >
                  <Icon v-if="option.correct" name="check" :size="16" class="text-[#16a34a]"/>
                </button>

                <label :for="`quiz-question-${qi}-option-${oi}`" class="sr-only">
                  Texte de l'option {{ oi + 1 }} de la question {{ qi + 1 }}
                </label>
                <input
                  :id="`quiz-question-${qi}-option-${oi}`"
                  v-model="option.text"
                  type="text"
                  maxlength="1000"
                  placeholder="Texte de l'option"
                  class="flex-1 h-10 px-3 border border-input rounded-[10px] text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                />

                <button
                  type="button"
                  class="text-muted hover:text-danger transition-colors disabled:opacity-30 disabled:hover:text-muted"
                  aria-label="Supprimer l'option"
                  :disabled="question.options.length <= 2"
                  @click="removeOption(question, oi)"
                >
                  <Icon name="close" :size="18"/>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Barre d'enregistrement -->
    <div class="flex items-center justify-end gap-3 mt-6">
      <button
        class="h-10 px-4 rounded-[10px] border border-input text-primary text-sm font-semibold flex items-center gap-2 hover:bg-surface-tint transition-colors"
        @click="addQuestion"
      >
        <Icon name="add" :size="18"/>
        Ajouter une question
      </button>
      <button
        :disabled="saving"
        class="h-10 px-6 rounded-[10px] bg-primary text-white text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
        @click="save"
      >
        <Icon name="save" :size="18"/>
        {{ saving ? 'Enregistrement...' : 'Enregistrer les questions' }}
      </button>
    </div>

    <!-- Import d'un fichier JSON de questions -->
    <Modal v-if="showImport" @close="showImport = false">
      <div class="px-6 pt-6 pb-6 w-full max-w-[520px]">
        <h3 class="text-[18px] font-semibold text-navy mb-1">Importer des questions</h3>
        <p class="text-[13px] text-muted mb-5">
          Le fichier remplit le formulaire. Rien n'est enregistré tant que vous n'avez pas
          relu et cliqué sur Enregistrer les questions.
        </p>

        <fieldset class="mb-5">
          <legend class="text-[13px] font-medium text-ink-soft mb-2">Que faire des questions actuelles ?</legend>
          <label class="flex items-start gap-3 cursor-pointer mb-2">
            <input v-model="importMode" type="radio" value="replace"
                   class="mt-0.5 w-4 h-4 accent-[var(--color-primary)] cursor-pointer"/>
            <span>
              <span class="block text-[14px] text-ink">Remplacer</span>
              <span class="block text-[12px] text-muted">Les {{ questions.length }} question(s) affichées sont retirées.</span>
            </span>
          </label>
          <label class="flex items-start gap-3 cursor-pointer">
            <input v-model="importMode" type="radio" value="append"
                   class="mt-0.5 w-4 h-4 accent-[var(--color-primary)] cursor-pointer"/>
            <span>
              <span class="block text-[14px] text-ink">Ajouter à la suite</span>
              <span class="block text-[12px] text-muted">Les questions importées viennent après les existantes.</span>
            </span>
          </label>
        </fieldset>

        <label for="quiz-import-file" class="sr-only">Fichier JSON de questions</label>
        <input id="quiz-import-file" ref="importFileInput" type="file" accept="application/json,.json"
               class="hidden" @change="onImportFileSelected"/>

        <div v-if="importErrors.length" class="bg-danger/8 rounded-[10px] px-4 py-3 mb-4">
          <p class="text-[13px] font-semibold text-danger mb-1">Import refusé</p>
          <ul class="text-[13px] text-danger flex flex-col gap-0.5">
            <li v-for="(message, i) in importErrors.slice(0, 5)" :key="i">{{ message }}</li>
          </ul>
          <p v-if="importErrors.length > 5" class="text-[12px] text-danger mt-1">
            et {{ importErrors.length - 5 }} autre(s) erreur(s).
          </p>
        </div>

        <div class="flex items-center justify-between gap-3">
          <button type="button" class="text-primary text-[13px] font-semibold hover:underline flex items-center gap-1"
                  @click="downloadTemplate">
            <Icon name="download" :size="16"/>
            Télécharger un modèle
          </button>
          <div class="flex gap-3">
            <button type="button"
                    class="h-10 px-4 rounded-[10px] border border-input text-ink text-sm font-semibold hover:bg-surface-tint transition-colors"
                    @click="showImport = false">
              Annuler
            </button>
            <button type="button"
                    class="h-10 px-5 rounded-[10px] bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                    @click="pickImportFile">
              Choisir un fichier
            </button>
          </div>
        </div>
      </div>
    </Modal>

    <Toast
      v-if="toast"
      :message="toast.message"
      :variant="toast.variant"
      :duration="toast.duration"
      @close="toast = null"
    />
  </template>
</template>
