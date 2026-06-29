<script setup>
// Espace formateur, gestion de contenu : le contenu d'un module.
// Les cours et exercices s'éditent sur des pages dédiées (contenu Markdown long).
// Le quiz (métadonnées courtes) reste géré dans une modale ; ses questions ont
// leur propre éditeur. GET /api/modules/{id} fournit cours, exercices et quiz.
import {computed, onMounted, reactive, ref, watch} from 'vue'
import {useRoute} from 'vue-router'
import {moduleService} from '@/services/moduleService'
import {courseService} from '@/services/courseService'
import {exerciseService} from '@/services/exerciseService'
import {quizService} from '@/services/quizService'
import Icon from '@/components/Icon.vue'
import StatusChip from '@/components/StatusChip.vue'
import Breadcrumb from '@/components/Breadcrumb.vue'
import Modal from '@/components/Modal.vue'

const route = useRoute()
const moduleId = Number(route.params.id)

const loading = ref(true)
const error = ref('')
const module = ref(null)
const success = ref('')
const tab = ref('courses')

const courses = computed(() => module.value?.courses || [])
const exercises = computed(() => module.value?.exercises || [])
const quiz = computed(() => module.value?.quiz || null)

const tabs = computed(() => [
  {key: 'courses', label: `Cours (${courses.value.length})`},
  {key: 'exercises', label: `Exercices (${exercises.value.length})`},
  {key: 'quiz', label: `Quiz (${quiz.value ? 1 : 0})`},
  {key: 'order', label: 'Ordre'}
])

// Réordonnancement : liste unifiée cours + exercices (le quiz reste en fin de module).
const orderItems = ref([])
const orderDirty = ref(false)
const savingOrder = ref(false)
const orderError = ref('')

function buildOrderItems() {
  const merged = [
    ...courses.value.map((c) => ({type: 'COURSE', id: c.id, name: c.name})),
    ...exercises.value.map((e) => ({type: 'EXERCISE', id: e.id, name: e.name}))
  ]
  // Tri par position pour refléter l'ordre actuel, puis on travaille sur une copie locale.
  const byId = (item) => (item.type === 'COURSE' ? courses.value : exercises.value)
    .find((x) => x.id === item.id)?.position ?? 0
  merged.sort((a, b) => byId(a) - byId(b))
  orderItems.value = merged
  orderDirty.value = false
  orderError.value = ''
}

watch(tab, (value) => {
  if (value === 'order') {
    buildOrderItems()
  }
})

function moveItem(index, delta) {
  const target = index + delta
  if (target < 0 || target >= orderItems.value.length) {
    return
  }
  const copy = [...orderItems.value]
  const [moved] = copy.splice(index, 1)
  copy.splice(target, 0, moved)
  orderItems.value = copy
  orderDirty.value = true
}

async function saveOrder() {
  orderError.value = ''
  savingOrder.value = true
  try {
    await moduleService.reorderContent(moduleId, orderItems.value.map(({type, id}) => ({type, id})))
    success.value = 'Ordre du contenu mis à jour.'
    await load()
    buildOrderItems()
  } catch (err) {
    orderError.value = err.message || 'La mise à jour de l\'ordre a échoué.'
  } finally {
    savingOrder.value = false
  }
}

const breadcrumb = computed(() => {
  const items = [{label: 'Contenus', to: '/formateur/contenus'}]
  if (module.value?.blockId) {
    items.push({label: module.value.blockName || 'Bloc', to: `/formateur/contenus/blocs/${module.value.blockId}`})
  }
  items.push({label: module.value?.name || 'Module'})
  return items
})

// Quiz (modale métadonnées)
const showQuizForm = ref(false)
const quizEditing = ref(false)
const quizForm = reactive({name: '', content: ''})
const quizError = ref('')
const savingQuiz = ref(false)

function openCreateQuiz() {
  quizEditing.value = false
  quizForm.name = ''
  quizForm.content = ''
  quizError.value = ''
  showQuizForm.value = true
}

function openEditQuiz() {
  quizEditing.value = true
  quizForm.name = quiz.value.name || ''
  quizForm.content = quiz.value.content || ''
  quizError.value = ''
  showQuizForm.value = true
}

async function saveQuiz() {
  quizError.value = ''
  const name = quizForm.name.trim()
  if (name.length < 2 || name.length > 255) {
    quizError.value = 'Le nom doit contenir entre 2 et 255 caractères.'
    return
  }
  const content = quizForm.content.trim()
  if (!content) {
    quizError.value = 'La consigne est obligatoire.'
    return
  }
  if (content.length > 50000) {
    quizError.value = 'La consigne ne doit pas dépasser 50 000 caractères.'
    return
  }
  savingQuiz.value = true
  try {
    const payload = {name, content, moduleId}
    if (quizEditing.value) {
      await quizService.updateQuiz(quiz.value.id, payload)
      success.value = 'Quiz modifié avec succès.'
    } else {
      await quizService.createQuiz(payload)
      success.value = 'Quiz créé avec succès.'
    }
    showQuizForm.value = false
    await load()
  } catch (err) {
    quizError.value = err.message || "L'enregistrement a échoué."
  } finally {
    savingQuiz.value = false
  }
}

// Suppression (cours / exercice / quiz)
const showDelete = ref(false)
const deleteType = ref('course')
const deleting = ref(null)
const deleteError = ref('')
const removing = ref(false)

function openDelete(type, item) {
  deleteType.value = type
  deleting.value = item
  deleteError.value = ''
  showDelete.value = true
}

async function confirmDelete() {
  deleteError.value = ''
  removing.value = true
  try {
    if (deleteType.value === 'course') {
      await courseService.deleteCourse(deleting.value.id)
    } else if (deleteType.value === 'quiz') {
      await quizService.deleteQuiz(deleting.value.id)
    } else {
      await exerciseService.deleteExercise(deleting.value.id)
    }
    success.value = 'Élément supprimé.'
    showDelete.value = false
    deleting.value = null
    await load()
  } catch (err) {
    deleteError.value = err.message || 'La suppression a échoué.'
  } finally {
    removing.value = false
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    module.value = await moduleService.getModule(moduleId)
  } catch (err) {
    error.value = err.message || 'Impossible de charger le module.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div v-if="loading" class="text-[15px] text-muted py-10 text-center">Chargement du module...</div>
  <div v-else-if="error" class="text-[15px] text-danger bg-danger/8 rounded-[10px] px-4 py-3">{{ error }}</div>

  <template v-else-if="module">
    <Breadcrumb :items="breadcrumb"/>
    <h1 class="text-[30px] font-semibold text-navy mb-1">{{ module.name }}</h1>
    <p class="text-ink-soft mb-6">Gestion du contenu du module</p>

    <p v-if="success" class="text-[14px] text-success bg-success/10 rounded-[10px] px-4 py-2.5 mb-5">{{ success }}</p>

    <!-- Onglets -->
    <div class="flex gap-6 border-b border-line mb-5">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="pb-3 text-sm font-semibold transition-colors -mb-px"
        :class="tab === t.key ? 'text-primary border-b-2 border-primary' : 'text-ink-soft hover:text-ink'"
        @click="tab = t.key"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- Cours -->
    <div v-if="tab === 'courses'">
      <div class="flex justify-end mb-4">
        <RouterLink
          :to="`/formateur/contenus/modules/${moduleId}/cours/nouveau`"
          class="h-10 px-4 rounded-[10px] bg-primary text-white text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <Icon name="add" :size="18"/>
          Nouveau cours
        </RouterLink>
      </div>
      <p v-if="courses.length === 0" class="text-[15px] text-muted py-8 text-center">Aucun cours dans ce module.</p>
      <div v-else class="flex flex-col gap-3">
        <div v-for="c in courses" :key="c.id"
             class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-4 flex items-center gap-4">
          <div class="w-10 h-10 rounded-full bg-surface-tint flex items-center justify-center text-primary shrink-0">
            <Icon name="menu_book" :size="20"/>
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-[16px] font-semibold text-ink truncate">{{ c.name }}</h3>
            <p class="text-[13px] text-ink-soft line-clamp-1">{{ c.description || 'Aucune description.' }}</p>
          </div>
          <StatusChip v-if="c.videoUrl" label="Vidéo" variant="primary" icon="play_circle"/>
          <RouterLink
            :to="`/formateur/contenus/cours/${c.id}`"
            class="h-9 w-9 rounded-[10px] border border-input text-primary flex items-center justify-center hover:bg-surface-tint transition-colors"
            aria-label="Modifier"
          >
            <Icon name="edit" :size="16"/>
          </RouterLink>
          <button
            class="h-9 w-9 rounded-[10px] border border-danger text-danger flex items-center justify-center hover:bg-danger/8 transition-colors"
            aria-label="Supprimer" @click="openDelete('course', c)">
            <Icon name="delete" :size="16"/>
          </button>
        </div>
      </div>
    </div>

    <!-- Exercices -->
    <div v-else-if="tab === 'exercises'">
      <div class="flex justify-end mb-4">
        <RouterLink
          :to="`/formateur/contenus/modules/${moduleId}/exercices/nouveau`"
          class="h-10 px-4 rounded-[10px] bg-primary text-white text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <Icon name="add" :size="18"/>
          Nouvel exercice
        </RouterLink>
      </div>
      <p v-if="exercises.length === 0" class="text-[15px] text-muted py-8 text-center">Aucun exercice dans ce
        module.</p>
      <div v-else class="flex flex-col gap-3">
        <div v-for="e in exercises" :key="e.id"
             class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-4 flex items-center gap-4">
          <div class="w-10 h-10 rounded-full bg-surface-tint flex items-center justify-center text-primary shrink-0">
            <Icon name="terminal" :size="20"/>
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-[16px] font-semibold text-ink truncate">{{ e.name }}</h3>
          </div>
          <RouterLink
            :to="`/formateur/contenus/exercices/${e.id}`"
            class="h-9 w-9 rounded-[10px] border border-input text-primary flex items-center justify-center hover:bg-surface-tint transition-colors"
            aria-label="Modifier"
          >
            <Icon name="edit" :size="16"/>
          </RouterLink>
          <button
            class="h-9 w-9 rounded-[10px] border border-danger text-danger flex items-center justify-center hover:bg-danger/8 transition-colors"
            aria-label="Supprimer" @click="openDelete('exercise', e)">
            <Icon name="delete" :size="16"/>
          </button>
        </div>
      </div>
    </div>

    <!-- Quiz (un seul par module) -->
    <div v-else-if="tab === 'quiz'">
      <div v-if="quiz"
           class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div class="w-10 h-10 rounded-full bg-surface-tint flex items-center justify-center text-primary shrink-0">
          <Icon name="quiz" :size="20"/>
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="text-[16px] font-semibold text-ink truncate">{{ quiz.name }}</h3>
          <p class="text-[13px] text-ink-soft line-clamp-1">{{ quiz.content }}</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <RouterLink
            :to="`/formateur/contenus/quiz/${quiz.id}`"
            class="h-9 px-3 rounded-[10px] bg-primary text-white text-sm font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity"
          >
            <Icon name="format_list_numbered" :size="16"/>
            Gérer les questions
          </RouterLink>
          <button
            class="h-9 w-9 rounded-[10px] border border-input text-primary flex items-center justify-center hover:bg-surface-tint transition-colors"
            aria-label="Modifier" @click="openEditQuiz">
            <Icon name="edit" :size="16"/>
          </button>
          <button
            class="h-9 w-9 rounded-[10px] border border-danger text-danger flex items-center justify-center hover:bg-danger/8 transition-colors"
            aria-label="Supprimer" @click="openDelete('quiz', quiz)">
            <Icon name="delete" :size="16"/>
          </button>
        </div>
      </div>
      <div v-else class="text-center py-8">
        <p class="text-[15px] text-muted mb-4">Aucun quiz dans ce module.</p>
        <button
          class="h-10 px-5 rounded-[10px] bg-primary text-white text-sm font-semibold inline-flex items-center gap-2 hover:opacity-90 transition-opacity"
          @click="openCreateQuiz">
          <Icon name="add" :size="18"/>
          Créer le quiz
        </button>
      </div>
    </div>

    <!-- Ordre : réorganiser cours et exercices (le quiz reste en fin de module) -->
    <div v-else-if="tab === 'order'">
      <p class="text-[14px] text-ink-soft mb-4">
        Glissez l'ordre avec les flèches. Un exercice reste verrouillé pour l'apprenant tant que les cours situés avant
        lui ne sont pas terminés.
      </p>
      <p v-if="orderItems.length === 0" class="px-5 py-6 text-[15px] text-muted bg-surface rounded-2xl">
        Ce module ne contient encore ni cours ni exercice à ordonner.
      </p>
      <div v-else class="bg-surface rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
        <div
          v-for="(item, i) in orderItems"
          :key="`${item.type}-${item.id}`"
          class="flex items-center gap-3 px-5 py-3"
          :class="{ 'border-t border-line-soft': i > 0 }"
        >
          <span class="w-7 text-[13px] text-muted tabular-nums">{{ i + 1 }}</span>
          <div class="w-9 h-9 rounded-full bg-surface-tint flex items-center justify-center text-primary shrink-0">
            <Icon :name="item.type === 'COURSE' ? 'menu_book' : 'terminal'" :size="18"/>
          </div>
          <div class="flex-1 min-w-0">
            <span class="text-[15px] text-ink block truncate">{{ item.name }}</span>
            <span class="text-[12px] text-muted">{{ item.type === 'COURSE' ? 'Cours' : 'Exercice' }}</span>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <button
              class="h-8 w-8 rounded-[8px] border border-input text-primary flex items-center justify-center hover:bg-surface-tint transition-colors disabled:opacity-40"
              aria-label="Monter" :disabled="i === 0" @click="moveItem(i, -1)">
              <Icon name="keyboard_arrow_up" :size="18"/>
            </button>
            <button
              class="h-8 w-8 rounded-[8px] border border-input text-primary flex items-center justify-center hover:bg-surface-tint transition-colors disabled:opacity-40"
              aria-label="Descendre" :disabled="i === orderItems.length - 1" @click="moveItem(i, 1)">
              <Icon name="keyboard_arrow_down" :size="18"/>
            </button>
          </div>
        </div>
      </div>

      <p v-if="orderError" class="text-[13px] text-danger mt-3">{{ orderError }}</p>

      <div v-if="orderItems.length > 0" class="flex justify-end mt-4">
        <button
          type="button"
          :disabled="!orderDirty || savingOrder"
          class="h-10 px-5 rounded-[10px] bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          @click="saveOrder">
          {{ savingOrder ? 'Enregistrement...' : 'Enregistrer l\'ordre' }}
        </button>
      </div>
    </div>
  </template>

  <!-- Modale quiz (métadonnées) -->
  <Modal v-if="showQuizForm" @close="showQuizForm = false">
    <div class="px-6 pt-6 pb-6 w-full max-w-[520px]">
      <h3 class="text-[20px] font-semibold text-navy mb-5">{{ quizEditing ? 'Modifier le quiz' : 'Nouveau quiz' }}</h3>
      <div class="flex flex-col gap-4">
        <div>
          <label class="block text-[13px] font-medium text-ink-soft mb-1.5">Nom du quiz</label>
          <input v-model="quizForm.name" type="text" maxlength="255"
                 class="w-full h-10 px-3 border border-input rounded-[10px] text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"/>
        </div>
        <div>
          <label class="block text-[13px] font-medium text-ink-soft mb-1.5">Consigne du quiz</label>
          <textarea v-model="quizForm.content" rows="4" maxlength="50000"
                    placeholder="Instructions affichées avant le quiz"
                    class="w-full border border-input rounded-[10px] px-3 py-2 text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors resize-none"></textarea>
        </div>
        <p v-if="quizError" class="text-[13px] text-danger">{{ quizError }}</p>
        <div class="flex justify-end gap-3 mt-1">
          <button type="button"
                  class="h-10 px-4 rounded-[10px] border border-input text-ink text-sm font-semibold hover:bg-surface-tint transition-colors"
                  @click="showQuizForm = false">Annuler
          </button>
          <button type="button" :disabled="savingQuiz"
                  class="h-10 px-5 rounded-[10px] bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
                  @click="saveQuiz">
            {{ savingQuiz ? 'Enregistrement...' : 'Enregistrer' }}
          </button>
        </div>
      </div>
    </div>
  </Modal>

  <!-- Modale suppression -->
  <Modal v-if="showDelete" @close="showDelete = false">
    <div class="px-6 pt-6 pb-6 w-full max-w-[420px] text-center">
      <div class="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto mb-4">
        <Icon name="warning" :size="26"/>
      </div>
      <h3 class="text-[18px] font-semibold text-navy mb-2">Confirmer la suppression</h3>
      <p class="text-[14px] text-ink-soft mb-4">
        Confirmez-vous la suppression de <strong>{{ deleting?.name }}</strong> ? Cette action est irréversible.
      </p>
      <p v-if="deleteError" class="text-[13px] text-danger mb-4">{{ deleteError }}</p>
      <div class="flex justify-center gap-3">
        <button type="button"
                class="h-10 px-4 rounded-[10px] border border-input text-ink text-sm font-semibold hover:bg-surface-tint transition-colors"
                @click="showDelete = false">Annuler
        </button>
        <button type="button" :disabled="removing"
                class="h-10 px-5 rounded-[10px] bg-danger text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
                @click="confirmDelete">
          {{ removing ? 'Suppression...' : 'Supprimer' }}
        </button>
      </div>
    </div>
  </Modal>
</template>
