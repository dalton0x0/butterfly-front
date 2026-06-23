<script setup>
// Espace formateur : éditeur des questions d'un quiz.
// GET /api/quizzes/{id}/questions charge les questions existantes (avec les
// bonnes réponses). PUT /api/quizzes/{id}/questions remplace l'intégralité des
// questions. Le score sera calculé côté serveur lors du passage par l'apprenant.
import {ref, computed, onMounted} from 'vue'
import {useRoute} from 'vue-router'
import {quizService} from '@/services/quizService'
import Icon from '@/components/Icon.vue'
import Breadcrumb from '@/components/Breadcrumb.vue'

const route = useRoute()
const quizId = Number(route.params.id)

const loading = ref(true)
const error = ref('')
const success = ref('')
const saving = ref(false)
const saveError = ref('')
const quiz = ref(null)
const questions = ref([])

const QUESTION_TYPES = [
  {value: 'SINGLE_CHOICE', label: 'Choix simple'},
  {value: 'MULTIPLE_CHOICE', label: 'Choix multiple'}
]

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

function validate() {
  for (const [qi, q] of questions.value.entries()) {
    const statement = q.statement.trim()
    if (!statement) {
      return `Question ${qi + 1} : l'énoncé est obligatoire.`
    }
    if (statement.length > 2000) {
      return `Question ${qi + 1} : l'énoncé dépasse 2000 caractères.`
    }
    if (!q.points || Number(q.points) < 1) {
      return `Question ${qi + 1} : les points doivent être strictement positifs.`
    }
    if (q.options.length < 2) {
      return `Question ${qi + 1} : au moins deux options sont requises.`
    }
    for (const [oi, o] of q.options.entries()) {
      if (!o.text.trim()) {
        return `Question ${qi + 1}, option ${oi + 1} : le texte est obligatoire.`
      }
      if (o.text.length > 1000) {
        return `Question ${qi + 1}, option ${oi + 1} : le texte dépasse 1000 caractères.`
      }
    }
    const correctCount = q.options.filter((o) => o.correct).length
    if (q.type === 'SINGLE_CHOICE' && correctCount !== 1) {
      return `Question ${qi + 1} : sélectionnez exactement une bonne réponse.`
    }
    if (q.type === 'MULTIPLE_CHOICE' && correctCount < 1) {
      return `Question ${qi + 1} : sélectionnez au moins une bonne réponse.`
    }
  }
  return ''
}

async function save() {
  saveError.value = ''
  success.value = ''
  const validationError = validate()
  if (validationError) {
    saveError.value = validationError
    return
  }
  saving.value = true
  try {
    const payload = questions.value.map((q) => ({
      statement: q.statement.trim(),
      type: q.type,
      points: Number(q.points),
      options: q.options.map((o) => ({text: o.text.trim(), correct: Boolean(o.correct)}))
    }))
    await quizService.updateQuestions(quizId, payload)
    success.value = 'Questions enregistrées avec succès.'
  } catch (err) {
    saveError.value = err.message || "L'enregistrement a échoué."
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
      <button
          class="h-10 px-4 rounded-[10px] border border-input text-primary text-sm font-semibold flex items-center gap-2 hover:bg-surface-tint transition-colors self-start"
          @click="addQuestion"
      >
        <Icon name="add" :size="18"/>
        Ajouter une question
      </button>
    </div>

    <p v-if="success" class="text-[14px] text-success bg-success/10 rounded-[10px] px-4 py-2.5 mb-5">{{ success }}</p>
    <p v-if="saveError" class="text-[14px] text-danger bg-danger/8 rounded-[10px] px-4 py-2.5 mb-5">{{ saveError }}</p>

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
            <label class="block text-[13px] font-medium text-ink-soft mb-1.5">Énoncé</label>
            <textarea
                v-model="question.statement"
                rows="2"
                maxlength="2000"
                class="w-full border border-input rounded-[10px] px-3 py-2 text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors resize-none"
            ></textarea>
          </div>

          <div class="flex flex-wrap gap-4">
            <div class="flex-1 min-w-[160px]">
              <label class="block text-[13px] font-medium text-ink-soft mb-1.5">Type</label>
              <select
                  v-model="question.type"
                  class="w-full h-10 px-3 border border-input rounded-[10px] text-[14px] text-ink bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  @change="onTypeChange(question)"
              >
                <option v-for="t in QUESTION_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
              </select>
            </div>
            <div class="w-28">
              <label class="block text-[13px] font-medium text-ink-soft mb-1.5">Points</label>
              <input
                  v-model="question.points"
                  type="number"
                  min="1"
                  class="w-full h-10 px-3 border border-input rounded-[10px] text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="block text-[13px] font-medium text-ink-soft">
                Options
                <span class="text-muted font-normal">
                  ({{
                    question.type === 'MULTIPLE_CHOICE' ? 'plusieurs bonnes réponses possibles' : 'une seule bonne réponse'
                  }})
                </span>
              </label>
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

                <input
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
  </template>
</template>
