<script setup>
// Détail d'un exercice : énoncé à gauche, dépôt et historique à droite.
// GET /api/exercises/{id} pour l'énoncé. Soumission en deux temps côté back :
// POST .../submissions (contenu) puis POST .../submissions/{id}/files (fichiers).
// Historique via GET /api/progress/me/exercises/{exerciseId}/submissions.
import {ref, computed, onMounted} from 'vue'
import {useRoute} from 'vue-router'
import {useAuthStore} from '@/stores/auth'
import {exerciseService} from '@/services/exerciseService'
import {validateUploadFile, formatFileSize, ALLOWED_UPLOAD_ACCEPT} from '@/utils/upload'
import Icon from '@/components/Icon.vue'
import StatusChip from '@/components/StatusChip.vue'
import Breadcrumb from '@/components/Breadcrumb.vue'
import MarkdownContent from '@/components/MarkdownContent.vue'

const route = useRoute()
const auth = useAuthStore()

const loading = ref(true)
const error = ref('')
const exercise = ref(null)
const submissions = ref([])

// Dépôt
const content = ref('')
const selectedFiles = ref([])
const fileInput = ref(null)
const submitting = ref(false)
const submitError = ref('')
const submitSuccess = ref('')

// Seul un USER peut soumettre côté back.
const canSubmit = computed(() => auth.role === 'USER')

const breadcrumb = computed(() => {
  const items = [{label: 'Mes blocs', to: '/blocs'}]
  if (exercise.value?.moduleId) {
    items.push({label: exercise.value.moduleName || 'Module', to: `/modules/${exercise.value.moduleId}`})
  }
  items.push({label: exercise.value?.name || 'Exercice'})
  return items
})

const STATUS_MAP = {
  NOT_STARTED: {label: 'À faire', variant: 'neutral', icon: 'radio_button_unchecked'},
  IN_PROGRESS: {label: 'En cours', variant: 'primary', icon: 'schedule'},
  SUBMITTED: {label: 'En attente', variant: 'warning', icon: 'schedule'},
  VALIDATED: {label: 'Validé', variant: 'success', icon: 'check_circle'},
  REJECTED: {label: 'Rejeté', variant: 'danger', icon: 'cancel'}
}

function statusChip(status) {
  return STATUS_MAP[status] || STATUS_MAP.NOT_STARTED
}

// Tentatives les plus récentes en premier.
const sortedSubmissions = computed(() =>
    [...submissions.value].sort((a, b) => (b.attemptNumber ?? 0) - (a.attemptNumber ?? 0))
)

function formatDate(value) {
  if (!value) {
    return ''
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime())
      ? ''
      : date.toLocaleDateString('fr-FR', {day: '2-digit', month: 'short', year: 'numeric'})
}

// Sélection de fichiers
function openFilePicker() {
  fileInput.value?.click()
}

function onFilesSelected(event) {
  addFiles(Array.from(event.target.files || []))
  event.target.value = ''
}

function onDrop(event) {
  addFiles(Array.from(event.dataTransfer?.files || []))
}

function addFiles(files) {
  submitError.value = ''
  for (const file of files) {
    const validationError = validateUploadFile(file)
    if (validationError) {
      submitError.value = `${file.name} : ${validationError}`
      continue
    }
    selectedFiles.value.push(file)
  }
}

function removeFile(index) {
  selectedFiles.value.splice(index, 1)
}

// Soumission
async function handleSubmit() {
  submitError.value = ''
  submitSuccess.value = ''
  if (!content.value.trim()) {
    submitError.value = 'Le contenu de la soumission est obligatoire.'
    return
  }
  submitting.value = true
  try {
    const submission = await exerciseService.submit(exercise.value.id, content.value.trim())
    // On joint les fichiers à la soumission qui vient d'être créée.
    for (const file of selectedFiles.value) {
      await exerciseService.uploadFile(exercise.value.id, submission.id, file)
    }
    submitSuccess.value = 'Soumission envoyée avec succès.'
    content.value = ''
    selectedFiles.value = []
    await loadSubmissions()
  } catch (err) {
    submitError.value = err.message || "L'envoi de la soumission a échoué."
  } finally {
    submitting.value = false
  }
}

// Téléchargement d'un fichier
async function download(submission, file) {
  try {
    const blob = await exerciseService.downloadFile(submission.id, file.id)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = file.originalFilename || 'fichier'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  } catch {
    submitError.value = 'Le téléchargement du fichier a échoué.'
  }
}

async function loadSubmissions() {
  const page = await exerciseService.getMySubmissions(exercise.value.id).catch(() => ({items: []}))
  submissions.value = page.items
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    exercise.value = await exerciseService.getExercise(Number(route.params.id))
    await loadSubmissions()
  } catch (err) {
    error.value = err.message || "Impossible de charger l'exercice."
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div v-if="loading" class="text-[15px] text-muted py-10 text-center">Chargement de l'exercice...</div>
  <div v-else-if="error" class="text-[15px] text-danger bg-danger/8 rounded-[10px] px-4 py-3">{{ error }}</div>

  <template v-else-if="exercise">
    <Breadcrumb :items="breadcrumb"/>

    <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <!-- Énoncé -->
      <div class="lg:col-span-3 bg-surface rounded-2xl shadow-[var(--shadow-card)] p-6">
        <h1 class="text-[30px] font-semibold text-navy mb-4">{{ exercise.name }}</h1>
        <MarkdownContent :source="exercise.content"/>
      </div>

      <!-- Dépôt + historique -->
      <div class="lg:col-span-2 flex flex-col gap-6">
        <!-- Dépôt (apprenant uniquement) -->
        <div v-if="canSubmit" class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-5">
          <h3 class="text-[17px] font-semibold text-ink mb-4">Déposer ma solution</h3>

          <input
              ref="fileInput"
              type="file"
              multiple
              :accept="ALLOWED_UPLOAD_ACCEPT"
              class="hidden"
              @change="onFilesSelected"
          />

          <div
              class="border border-dashed border-input rounded-xl bg-background p-6 flex flex-col items-center text-center gap-1 mb-4 cursor-pointer hover:border-primary transition-colors"
              @click="openFilePicker"
              @drop.prevent="onDrop"
              @dragover.prevent
          >
            <Icon name="cloud_upload" :size="32" class="text-primary"/>
            <p class="text-[14px] text-ink">Glissez vos fichiers ici ou cliquez pour parcourir</p>
            <p class="text-[13px] text-muted">PDF, PNG, JPEG, TXT, ZIP - 5 Mo max</p>
          </div>

          <div v-if="selectedFiles.length" class="flex flex-col gap-2 mb-4">
            <div
                v-for="(f, i) in selectedFiles"
                :key="`${f.name}-${i}`"
                class="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-tint"
            >
              <Icon name="description" :size="20" class="text-primary"/>
              <span class="text-[14px] text-ink flex-1 truncate">{{ f.name }}</span>
              <span class="text-[13px] text-muted">{{ formatFileSize(f.size) }}</span>
              <button type="button" class="text-muted hover:text-danger transition-colors" @click.stop="removeFile(i)">
                <Icon name="close" :size="18"/>
              </button>
            </div>
          </div>

          <textarea
              v-model="content"
              rows="3"
              placeholder="Décrivez votre solution (obligatoire)"
              class="w-full border border-input rounded-[10px] px-3 py-2 text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors mb-3 resize-none"
          ></textarea>

          <p v-if="submitError" class="text-[13px] text-danger mb-3">{{ submitError }}</p>
          <p v-if="submitSuccess" class="text-[13px] text-success mb-3">{{ submitSuccess }}</p>

          <button
              type="button"
              :disabled="submitting"
              class="w-full h-10 rounded-[10px] bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
              @click="handleSubmit"
          >
            {{ submitting ? 'Envoi en cours...' : 'Soumettre' }}
          </button>
        </div>

        <!-- Historique -->
        <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-5">
          <h3 class="text-[17px] font-semibold text-ink mb-4">Historique des soumissions</h3>

          <p v-if="sortedSubmissions.length === 0" class="text-[14px] text-muted">Aucune soumission pour le moment.</p>

          <div v-else class="flex flex-col gap-5">
            <div v-for="s in sortedSubmissions" :key="s.id">
              <div class="flex items-center justify-between mb-2 gap-2">
                <span class="text-[14px] font-medium text-ink">Tentative {{
                    s.attemptNumber
                  }} - {{ formatDate(s.submittedAt) }}</span>
                <StatusChip v-bind="statusChip(s.status)"/>
              </div>

              <p v-if="s.content" class="text-[14px] text-ink-soft mb-2 whitespace-pre-wrap break-words">{{
                  s.content
                }}</p>

              <!-- Fichiers joints -->
              <div v-if="s.files && s.files.length" class="flex flex-col gap-1.5 mb-2">
                <button
                    v-for="file in s.files"
                    :key="file.id"
                    type="button"
                    class="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-tint hover:bg-surface-hover transition-colors text-left"
                    @click="download(s, file)"
                >
                  <Icon name="download" :size="18" class="text-primary shrink-0"/>
                  <span class="text-[14px] text-ink flex-1 truncate">{{ file.originalFilename }}</span>
                  <span class="text-[13px] text-muted">{{ formatFileSize(file.sizeBytes) }}</span>
                </button>
              </div>

              <!-- Note attribuée -->
              <p v-if="s.grade != null" class="text-[14px] text-ink mb-1">Note : {{ s.grade }} / 20</p>

              <!-- Retour du formateur -->
              <div v-if="s.feedback" class="rounded-xl p-3 bg-surface-tint">
                <p class="text-[14px] text-ink">{{ s.feedback }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
</template>
