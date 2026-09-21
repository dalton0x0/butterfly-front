<script setup>
// Espace formateur : corrections d'exercices, organisées en trois onglets.
// À corriger (SUBMITTED) : panneau de correction (note + retour, correction ou reprise).
// Corrigés / À retravailler : historique en lecture seule avec la note et le retour donnés.
//
// Vocabulaire : l'interface décrit la suite à donner, le serveur garde ses noms
// techniques (VALIDATED, REJECTED). « Corrigé » dit que la correction a eu lieu et que
// l'exercice est clos sans préjuger de la réussite : la note porte seule le jugement.
// « À retravailler » dit qu'un nouveau rendu est attendu avec ou sans note.
// File : GET /api/progress/exercises?status=... (restreinte aux apprenants du formateur).
import {computed, onMounted, ref} from 'vue'
import {usePagedList} from '@/composables/usePagedList'
import {useDebouncedRef} from '@/composables/useDebouncedRef'
import {formatDate} from '@/utils/date'
import {correctionService} from '@/services/correctionService'
import {exerciseService} from '@/services/exerciseService'
import {formatFileSize} from '@/utils/upload'
import {formatGrade, maxGrade} from '@/utils/grading'
import {saveBlobAs} from '@/utils/download'
import Icon from '@/components/Icon.vue'
import Pagination from '@/components/Pagination.vue'
import StatusChip from '@/components/StatusChip.vue'

const TABS = [
  {key: 'SUBMITTED', label: 'À corriger'},
  {key: 'VALIDATED', label: 'Corrigés'},
  {key: 'REJECTED', label: 'À retravailler'}
]

const reviewSuccess = ref('')

const currentTab = ref('SUBMITTED')
// Plus de carte identifiant vers nom : la réponse du serveur porte désormais le nom de
// l'apprenant sur chaque ligne. L'ancienne solution téléchargeait la liste complète des
// utilisateurs et devenait fausse dès que celle-ci dépassait une page.
const search = ref('')
const debouncedSearch = useDebouncedRef(search)

/*
  Onglet et recherche sont deux filtres serveur.
*/
const filters = computed(() => ({
  status: currentTab.value,
  search: debouncedSearch.value.trim() || undefined
}))

const {items: queue, page, totalPages, totalElements, loading, error, load, goToPage, refresh} = usePagedList(
  ({page: current, status, search: term}) =>
    correctionService.listProgress({status, search: term}, {page: current}),
  {filters: () => filters.value, errorMessage: 'Impossible de charger les corrections.'}
)

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

// Les trois onglets sont actionnables : un exercice rendu se corrige, un exercice déjà
// corrigé se réajuste, et un exercice renvoyé au travail se clôt sur le dernier rendu
// reçu quand la reprise demandée n'arrive jamais.
// La reprise ne se demande que sur un exercice rendu ou déjà corrigé : la redemander
// sur un exercice qui l'attend déjà n'aurait aucun effet, et le serveur la refuse.
const canAskForRework = computed(() => currentTab.value !== 'REJECTED')

function studentName(item) {
  if (!item) {
    return ''
  }
  const name = `${item.userFirstName || ''} ${item.userLastName || ''}`.trim()
  return name || `Apprenant #${item.userId}`
}

const STATUS_CHIP = {
  SUBMITTED: {label: 'En attente de correction', variant: 'warning'},
  VALIDATED: {label: 'Corrigé', variant: 'success'},
  REJECTED: {label: 'À retravailler', variant: 'danger'}
}

function statusChip(status) {
  return STATUS_CHIP[status] || STATUS_CHIP.SUBMITTED
}

const sortedSubmissions = computed(() =>
  [...submissions.value].sort((a, b) => (b.attemptNumber ?? 0) - (a.attemptNumber ?? 0))
)

const latestSubmission = computed(() => sortedSubmissions.value[0] || null)

// Soumission relue (porteuse de la note et du feedback) pour l'historique.
const reviewedSubmission = computed(() =>
  sortedSubmissions.value.find((s) => s.reviewedAt) || latestSubmission.value
)

// L'onglet est un filtre : le composable recharge et revient en page 1 de lui-même.
function changeTab(key) {
  if (currentTab.value === key) {
    return
  }
  currentTab.value = key
  selected.value = null
  submissions.value = []
  reviewSuccess.value = ''
}

async function select(item) {
  selected.value = item
  // Les deux onglets d'historique peuvent porter une note, une reprise comprise.
  grade.value = currentTab.value === 'SUBMITTED' ? null : item.grade
  feedback.value = ''
  actionError.value = ''
  detailError.value = ''
  submissions.value = []
  loadingDetail.value = true
  try {
    const page = await correctionService.getUserSubmissions(item.exerciseId, item.userId)
    submissions.value = page.items
    // Onglets d'historique : on pré-remplit le retour existant pour permettre sa
    // réédition plutôt que d'obliger le correcteur à le retaper.
    if (!isPending.value) {
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
    saveBlobAs(blob, file.originalFilename)
  } catch {
    detailError.value = 'Le téléchargement du fichier a échoué.'
  }
}

async function finishReview(verb) {
  reviewSuccess.value = `Exercice ${verb} pour ${studentName(selected.value)}.`
  selected.value = null
  submissions.value = []
  // Rechargement plutôt que retrait local : la ligne corrigée quitte l'onglet À corriger,
  // celle qui la suit doit remonter dans la page et le total affiché doit suivre.
  await refresh()
}

async function refreshAfterUpdate(message) {
  reviewSuccess.value = message
  selected.value = null
  submissions.value = []
  await refresh()
}

/**
 * Lit la note saisie et la contrôle.
 * Renvoie la note, null si le champ est vide ou undefined si la saisie est invalide
 * auquel cas le message d'erreur est déjà posé.
 */
function readGrade() {
  if (grade.value === null || grade.value === '') {
    return null
  }
  const numericGrade = Number(grade.value)
  if (Number.isNaN(numericGrade) || numericGrade < 0 || numericGrade > maxGrade.value) {
    actionError.value = `La note doit être comprise entre 0 et ${maxGrade.value}.`
    return undefined
  }
  return numericGrade
}

async function saveCorrection() {
  actionError.value = ''
  const numericGrade = readGrade()
  if (numericGrade === undefined) {
    return
  }
  // Clore un exercice sans l'évaluer priverait l'apprenant de son retour chiffré.
  if (numericGrade === null) {
    actionError.value = 'La note est obligatoire pour enregistrer une correction.'
    return
  }
  acting.value = true
  try {
    await correctionService.validate(selected.value.exerciseId, selected.value.userId, {
      grade: numericGrade,
      feedback: feedback.value.trim() || null
    })
    if (currentTab.value === 'VALIDATED') {
      await refreshAfterUpdate(`Note mise à jour pour ${studentName(selected.value)}.`)
    } else {
      await finishReview('corrigé')
    }
  } catch (err) {
    actionError.value = err.message || "L'enregistrement a échoué."
  } finally {
    acting.value = false
  }
}

async function askForRework() {
  actionError.value = ''
  // Note facultative ici : elle exprime « corrigé mais insuffisant ». Absente, la
  // progression repart sans note et l'apprenant n'a que le retour écrit.
  const numericGrade = readGrade()
  if (numericGrade === undefined) {
    return
  }
  acting.value = true
  try {
    await correctionService.reject(selected.value.exerciseId, selected.value.userId, {
      grade: numericGrade,
      feedback: feedback.value.trim() || null
    })
    await finishReview('renvoyé au travail')
  } catch (err) {
    actionError.value = err.message || 'La demande de reprise a échoué.'
  } finally {
    acting.value = false
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

  <!-- La recherche reste montée pendant le chargement : chaque frappe déclenche une
       requête, et un champ retiré du DOM à ce moment perdrait le focus. -->
  <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-4 flex flex-wrap gap-3 mb-6">
    <div class="flex items-center gap-2 flex-1 min-w-[200px] h-10 px-3 border border-input rounded-[10px] bg-white">
      <Icon name="search" :size="20" class="text-muted"/>
      <label for="corrections-search" class="sr-only">Rechercher un apprenant ou un exercice</label>
      <input id="corrections-search" v-model="search"
             placeholder="Rechercher un apprenant ou un exercice"
             class="flex-1 outline-none text-[14px] bg-transparent"/>
    </div>
  </div>

  <div v-if="loading" class="text-[15px] text-muted py-10 text-center">Chargement des corrections...</div>
  <div v-else-if="error" class="text-[15px] text-danger bg-danger/8 rounded-[10px] px-4 py-3">{{ error }}</div>

  <template v-else>
    <!-- File -->
    <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] overflow-hidden mb-6">
      <p v-if="queue.length === 0" class="px-5 py-8 text-[15px] text-muted text-center">
        <template v-if="filters.search">Aucun résultat pour cette recherche.</template>
        <template v-else-if="isPending">Aucune correction en attente.</template>
        <template v-else>Aucune correction dans cet historique.</template>
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
          v-for="c in queue"
          :key="c.id"
          class="border-t border-line-soft hover:bg-surface-hover transition-colors cursor-pointer"
          :class="{ 'bg-surface-tint/60': selected && selected.id === c.id }"
          @click="select(c)"
        >
          <td class="px-5 py-3"><span class="text-ink">{{ studentName(c) }}</span></td>
          <td class="px-5 py-3 text-ink-soft">{{ c.exerciseName }}</td>
          <td class="px-5 py-3 text-ink-soft">
            <template v-if="isPending">{{ formatDate(c.submittedAt) }}</template>
            <template v-else>{{ formatGrade(c.grade) }}</template>
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

      <Pagination
        :page="page"
        :total-pages="totalPages"
        :total-elements="totalElements"
        item-label="soumissions"
        @change="goToPage"
      />
    </div>

    <!-- Détail soumission -->
    <div v-if="selected" class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-6">
      <h3 class="text-[17px] font-semibold text-ink mb-5">
        Soumission de {{ studentName(selected) }} - {{ selected.exerciseName }}
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
              <p v-if="latestSubmission.content" class="text-[14px] text-ink whitespace-pre-wrap break-words">
                {{ latestSubmission.content }}</p>
              <p v-else class="text-[14px] text-muted italic">
                Aucune description, voir les fichiers joints.</p>
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

        <!-- Droite : panneau de correction, actionnable sur les trois onglets -->
        <div class="flex flex-col gap-4">
          <!-- Rappel de la correction en cours sur les onglets d'historique -->
          <div v-if="!isPending" class="flex items-center gap-3">
            <StatusChip v-bind="statusChip(selected.status)"/>
            <span v-if="reviewedSubmission && reviewedSubmission.reviewedAt" class="text-[13px] text-muted">
              Corrigé le {{ formatDate(reviewedSubmission.reviewedAt) }}
            </span>
          </div>

          <p v-if="currentTab === 'VALIDATED'"
             class="text-[13px] text-muted bg-surface-tint rounded-[10px] px-3 py-2">
            Cet exercice est déjà corrigé. Vous pouvez réajuster la note ou le retour,
            ou demander une reprise (les XP de correction seront alors annulés).
          </p>

          <p v-else-if="currentTab === 'REJECTED'"
             class="text-[13px] text-muted bg-surface-tint rounded-[10px] px-3 py-2">
            Cet exercice attend une reprise que l'apprenant n'a pas encore rendue.
            Vous pouvez le clore sur son dernier rendu en enregistrant une correction.
          </p>

          <div>
            <label for="corrections-feedback"
                   class="block text-[12px] font-semibold text-muted uppercase tracking-wide mb-2">
              Feedback pour l'apprenant (facultatif)
            </label>
            <textarea
              id="corrections-feedback"
              v-model="feedback"
              rows="5"
              placeholder="Saisissez votre commentaire constructif ici..."
              class="w-full border border-input rounded-[10px] px-3 py-2 text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors resize-none"
            ></textarea>
          </div>

          <div>
            <label class="block text-[12px] font-semibold text-muted uppercase tracking-wide mb-1.5" for="corrections-grade">
              Note (sur {{ maxGrade }})
              <span v-if="canAskForRework" class="normal-case font-normal text-muted">facultative pour une reprise</span>
            </label>
            <input id="corrections-grade"
              v-model="grade"
              type="number"
              min="0"
              :max="maxGrade"
              :placeholder="`0 - ${maxGrade}`"
              class="w-full h-10 px-3 border border-input rounded-[10px] text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>

          <p v-if="actionError" class="text-[13px] text-danger">{{ actionError }}</p>

          <div class="flex justify-start gap-3 mt-1">
            <button
              v-if="canAskForRework"
              type="button"
              :disabled="acting"
              class="h-10 px-5 rounded-[10px] border border-danger text-danger text-sm font-semibold hover:bg-danger/8 transition-colors flex items-center gap-2 disabled:opacity-60"
              @click="askForRework"
            >
              <Icon name="replay" :size="18"/>
              Demander une reprise
            </button>
            <button
              type="button"
              :disabled="acting"
              class="h-10 px-5 rounded-[10px] bg-[#16a34a] text-white text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-60"
              @click="saveCorrection"
            >
              <Icon name="check" :size="18"/>
              {{ currentTab === 'VALIDATED' ? 'Mettre à jour la correction' : 'Enregistrer la correction' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </template>
</template>
