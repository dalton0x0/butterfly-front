<script setup>
// Espace formateur : corrections d'exercices, organisées en trois onglets.
// À corriger (SUBMITTED) : panneau de correction (note + feedback, valider/rejeter).
// Validés / Rejetés : historique en lecture seule, avec la note et le feedback donnés.
// File : GET /api/progress/exercises?status=... (restreinte aux apprenants du formateur).
import {computed, onMounted, ref} from 'vue'
import {formatDate} from '@/utils/date'
import {correctionService} from '@/services/correctionService'
import {userService} from '@/services/userService'
import {exerciseService} from '@/services/exerciseService'
import {formatFileSize} from '@/utils/upload'
import Icon from '@/components/Icon.vue'
import StatusChip from '@/components/StatusChip.vue'

const TABS = [
  {key: 'SUBMITTED', label: 'À corriger'},
  {key: 'VALIDATED', label: 'Validés'},
  {key: 'REJECTED', label: 'Rejetés'}
]

const loading = ref(true)
const error = ref('')
const reviewSuccess = ref('')

const currentTab = ref('SUBMITTED')
const queue = ref([])
const usersMap = ref(new Map())
const search = ref('')

// Détail
const selected = ref(null)
const submissions = ref([])
const loadingDetail = ref(false)
const detailError = ref('')

// Correction (onglet À corriger uniquement)
const grade = ref(null)
const feedback = ref('')
const acting = ref(false)
const actionError = ref('')

// Seul l'onglet À corriger autorise les actions de correction.
const isPending = computed(() => currentTab.value === 'SUBMITTED')

const canReview = computed(() => currentTab.value === 'SUBMITTED' || currentTab.value === 'VALIDATED')

function studentName(userId) {
  return usersMap.value.get(userId) || `Apprenant #${userId}`
}

const STATUS_CHIP = {
  SUBMITTED: {label: 'En attente', variant: 'warning'},
  VALIDATED: {label: 'Validé', variant: 'success'},
  REJECTED: {label: 'Rejeté', variant: 'danger'}
}

function statusChip(status) {
  return STATUS_CHIP[status] || STATUS_CHIP.SUBMITTED
}

const filteredQueue = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) {
    return queue.value
  }
  return queue.value.filter(
    (item) =>
      studentName(item.userId).toLowerCase().includes(term) ||
      (item.exerciseName || '').toLowerCase().includes(term)
  )
})

const sortedSubmissions = computed(() =>
  [...submissions.value].sort((a, b) => (b.attemptNumber ?? 0) - (a.attemptNumber ?? 0))
)

const latestSubmission = computed(() => sortedSubmissions.value[0] || null)

// Soumission relue (porteuse de la note et du feedback) pour l'historique.
const reviewedSubmission = computed(() =>
  sortedSubmissions.value.find((s) => s.reviewedAt) || latestSubmission.value
)

async function changeTab(key) {
  if (currentTab.value === key) {
    return
  }
  currentTab.value = key
  selected.value = null
  submissions.value = []
  reviewSuccess.value = ''
  await load()
}

async function select(item) {
  selected.value = item
  grade.value = currentTab.value === 'VALIDATED' ? item.grade : null
  feedback.value = ''
  actionError.value = ''
  detailError.value = ''
  submissions.value = []
  loadingDetail.value = true
  try {
    const page = await correctionService.getUserSubmissions(item.exerciseId, item.userId)
    submissions.value = page.items
    // Onglet Validés : on pré-remplit le feedback existant pour permettre sa réédition.
    if (currentTab.value === 'VALIDATED') {
      feedback.value = reviewedSubmission.value?.feedback || ''
    }
  } catch (err) {
    detailError.value = err.message || 'Impossible de charger les soumissions.'
  } finally {
    loadingDetail.value = false
  }
}

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
    detailError.value = 'Le téléchargement du fichier a échoué.'
  }
}

function finishReview(verb) {
  reviewSuccess.value = `Exercice ${verb} pour ${studentName(selected.value.userId)}.`
  queue.value = queue.value.filter((i) => i.id !== selected.value.id)
  selected.value = null
  submissions.value = []
}

async function refreshAfterUpdate(message) {
  reviewSuccess.value = message
  selected.value = null
  submissions.value = []
  await load()
}

async function validate() {
  actionError.value = ''
  if (grade.value === null || grade.value === '') {
    actionError.value = 'La note est obligatoire.'
    return
  }
  const numericGrade = Number(grade.value)
  if (Number.isNaN(numericGrade) || numericGrade < 0 || numericGrade > 20) {
    actionError.value = 'La note doit être comprise entre 0 et 20.'
    return
  }
  acting.value = true
  try {
    await correctionService.validate(selected.value.exerciseId, selected.value.userId, {
      grade: numericGrade,
      feedback: feedback.value.trim() || null
    })
    if (currentTab.value === 'VALIDATED') {
      await refreshAfterUpdate(`Note mise à jour pour ${studentName(selected.value.userId)}.`)
    } else {
      finishReview('validé')
    }
  } catch (err) {
    actionError.value = err.message || 'La validation a échoué.'
  } finally {
    acting.value = false
  }
}

async function reject() {
  actionError.value = ''
  acting.value = true
  try {
    await correctionService.reject(selected.value.exerciseId, selected.value.userId, {
      feedback: feedback.value.trim() || null
    })
    finishReview('rejeté')
  } catch (err) {
    actionError.value = err.message || 'Le rejet a échoué.'
  } finally {
    acting.value = false
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [progress, users] = await Promise.all([
      correctionService.listProgress({status: currentTab.value}),
      userService.getUsers().catch(() => ({items: []}))
    ])
    usersMap.value = new Map(users.items.map((u) => [u.id, `${u.firstName} ${u.lastName}`]))
    queue.value = progress.items
  } catch (err) {
    error.value = err.message || 'Impossible de charger les corrections.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="flex items-center gap-3 mb-6">
    <h1 class="text-[30px] font-semibold text-navy">Corrections</h1>
    <StatusChip v-if="!loading" :label="`${queue.length}`" :variant="isPending ? 'warning' : 'neutral'"/>
  </div>

  <!-- Onglets -->
  <div class="flex gap-1 mb-6 border-b border-line">
    <button
      v-for="tab in TABS"
      :key="tab.key"
      type="button"
      class="px-4 py-2.5 text-[14px] font-medium border-b-2 -mb-px transition-colors"
      :class="currentTab === tab.key
        ? 'border-primary text-primary'
        : 'border-transparent text-ink-soft hover:text-ink'"
      @click="changeTab(tab.key)"
    >
      {{ tab.label }}
    </button>
  </div>

  <p v-if="reviewSuccess" class="text-[14px] text-success bg-success/10 rounded-[10px] px-4 py-2.5 mb-5">
    {{ reviewSuccess }}
  </p>

  <div v-if="loading" class="text-[15px] text-muted py-10 text-center">Chargement des corrections...</div>
  <div v-else-if="error" class="text-[15px] text-danger bg-danger/8 rounded-[10px] px-4 py-3">{{ error }}</div>

  <template v-else>
    <!-- Recherche -->
    <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-4 flex flex-wrap gap-3 mb-6">
      <div class="flex items-center gap-2 flex-1 min-w-[200px] h-10 px-3 border border-input rounded-[10px] bg-white">
        <Icon name="search" :size="20" class="text-muted"/>
        <input v-model="search" placeholder="Rechercher un apprenant ou un exercice"
               class="flex-1 outline-none text-[14px] bg-transparent"/>
      </div>
    </div>

    <!-- File -->
    <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] overflow-hidden mb-6">
      <p v-if="filteredQueue.length === 0" class="px-5 py-8 text-[15px] text-muted text-center">
        {{ isPending ? 'Aucune correction en attente.' : 'Aucune correction dans cet historique.' }}
      </p>
      <table v-else class="w-full text-[14px]">
        <thead>
        <tr class="bg-surface-tint text-[13px] text-ink-soft text-left">
          <th class="px-5 py-3 font-medium">Apprenant</th>
          <th class="px-5 py-3 font-medium">Exercice</th>
          <th class="px-5 py-3 font-medium">{{ isPending ? 'Soumis le' : 'Note' }}</th>
          <th class="px-5 py-3 font-medium">Tentatives</th>
          <th class="px-5 py-3 font-medium">Statut</th>
          <th class="px-5 py-3 font-medium text-right">Action</th>
        </tr>
        </thead>
        <tbody>
        <tr
          v-for="c in filteredQueue"
          :key="c.id"
          class="border-t border-line-soft hover:bg-surface-hover transition-colors cursor-pointer"
          :class="{ 'bg-surface-tint/60': selected && selected.id === c.id }"
          @click="select(c)"
        >
          <td class="px-5 py-3"><span class="text-ink">{{ studentName(c.userId) }}</span></td>
          <td class="px-5 py-3 text-ink-soft">{{ c.exerciseName }}</td>
          <td class="px-5 py-3 text-ink-soft">
            <template v-if="isPending">{{ formatDate(c.submittedAt) }}</template>
            <template v-else>{{ c.grade != null ? `${c.grade} / 20` : '-' }}</template>
          </td>
          <td class="px-5 py-3 text-ink-soft">{{ c.attempts }}</td>
          <td class="px-5 py-3">
            <StatusChip v-bind="statusChip(c.status)"/>
          </td>
          <td class="px-5 py-3 text-right">
            <button class="text-primary hover:bg-surface-tint p-2 rounded-full transition-colors"
                    @click.stop="select(c)">
              <Icon name="visibility" :size="20"/>
            </button>
          </td>
        </tr>
        </tbody>
      </table>
    </div>

    <!-- Détail soumission -->
    <div v-if="selected" class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-6">
      <h3 class="text-[17px] font-semibold text-ink mb-5">
        Soumission de {{ studentName(selected.userId) }} - {{ selected.exerciseName }}
      </h3>

      <div v-if="loadingDetail" class="text-[14px] text-muted py-6 text-center">Chargement de la soumission...</div>
      <div v-else-if="detailError" class="text-[14px] text-danger mb-4">{{ detailError }}</div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Gauche : contenu + fichiers de la dernière soumission -->
        <div class="flex flex-col gap-5">
          <div v-if="latestSubmission">
            <p class="text-[12px] font-semibold text-muted uppercase tracking-wide mb-2">
              Dernière soumission (tentative {{ latestSubmission.attemptNumber }})
            </p>
            <div class="rounded-xl p-3 bg-surface-tint">
              <p class="text-[14px] text-ink whitespace-pre-wrap break-words">{{ latestSubmission.content }}</p>
            </div>
          </div>

          <div v-if="latestSubmission && latestSubmission.files && latestSubmission.files.length">
            <p class="text-[12px] font-semibold text-muted uppercase tracking-wide mb-2">Fichiers joints</p>
            <div class="flex flex-col gap-2">
              <button
                v-for="file in latestSubmission.files"
                :key="file.id"
                type="button"
                class="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-surface-tint hover:bg-surface-hover transition-colors text-left"
                @click="download(latestSubmission, file)"
              >
                <Icon name="download" :size="20" class="text-primary shrink-0"/>
                <span class="text-[14px] text-ink flex-1 truncate">{{ file.originalFilename }}</span>
                <span class="text-[13px] text-muted">{{ formatFileSize(file.sizeBytes) }}</span>
              </button>
            </div>
          </div>

          <p v-if="!latestSubmission" class="text-[14px] text-muted">Aucune soumission trouvée.</p>
        </div>

        <!-- Droite : correction (À corriger) ou bilan en lecture seule (historique) -->
        <div class="flex flex-col gap-4">
          <template v-if="canReview">
            <p v-if="currentTab === 'VALIDATED'"
               class="text-[13px] text-muted bg-surface-tint rounded-[10px] px-3 py-2">
              Cet exercice est déjà validé. Vous pouvez réajuster la note ou le feedback,
              ou le rejeter (les XP de validation sera alors annulé).
            </p>

            <div>
              <p class="text-[12px] font-semibold text-muted uppercase tracking-wide mb-2">
                Feedback pour l'apprenant (facultatif)
              </p>
              <textarea
                v-model="feedback"
                rows="5"
                placeholder="Saisissez votre commentaire constructif ici..."
                class="w-full border border-input rounded-[10px] px-3 py-2 text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors resize-none"
              ></textarea>
            </div>

            <div>
              <label class="block text-[12px] font-semibold text-muted uppercase tracking-wide mb-1.5">Note (sur
                20)</label>
              <input
                v-model="grade"
                type="number"
                min="0"
                max="20"
                placeholder="0 - 20"
                class="w-full h-10 px-3 border border-input rounded-[10px] text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>

            <p v-if="actionError" class="text-[13px] text-danger">{{ actionError }}</p>

            <div class="flex justify-start gap-3 mt-1">
              <button
                type="button"
                :disabled="acting"
                class="h-10 px-5 rounded-[10px] border border-danger text-danger text-sm font-semibold hover:bg-danger/8 transition-colors flex items-center gap-2 disabled:opacity-60"
                @click="reject"
              >
                <Icon name="close" :size="18"/>
                Rejeter
              </button>
              <button
                type="button"
                :disabled="acting"
                class="h-10 px-5 rounded-[10px] bg-[#16a34a] text-white text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-60"
                @click="validate"
              >
                <Icon name="check" :size="18"/>
                {{ isPending ? 'Valider' : 'Mettre à jour' }}
              </button>
            </div>
          </template>

          <!-- Historique : bilan en lecture seule -->
          <template v-else>
            <div class="flex items-center gap-3">
              <StatusChip v-bind="statusChip(selected.status)"/>
              <span v-if="reviewedSubmission && reviewedSubmission.reviewedAt" class="text-[13px] text-muted">
                Corrigé le {{ formatDate(reviewedSubmission.reviewedAt) }}
              </span>
            </div>

            <div>
              <p class="text-[12px] font-semibold text-muted uppercase tracking-wide mb-1.5">Note attribuée</p>
              <p class="text-2xl font-semibold text-ink tabular-nums">
                {{ selected.grade != null ? `${selected.grade} / 20` : '-' }}
              </p>
            </div>

            <div>
              <p class="text-[12px] font-semibold text-muted uppercase tracking-wide mb-2">Feedback donné</p>
              <div class="rounded-xl p-3 bg-surface-tint min-h-[60px]">
                <p class="text-[14px] text-ink whitespace-pre-wrap break-words">
                  {{ (reviewedSubmission && reviewedSubmission.feedback) || 'Aucun feedback laissé.' }}
                </p>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </template>
</template>
