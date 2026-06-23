<script setup>
// Espace formateur, gestion de contenu : les modules d'un bloc.
// Le bloc et ses modules viennent de GET /api/blocks/{id}. CRUD via /api/modules.
// Les prérequis se remplacent via PUT /api/modules/{id}/prerequisites.
import {ref, reactive, computed, onMounted} from 'vue'
import {useRoute} from 'vue-router'
import {blockService} from '@/services/blockService'
import {moduleService} from '@/services/moduleService'
import Icon from '@/components/Icon.vue'
import StatusChip from '@/components/StatusChip.vue'
import Breadcrumb from '@/components/Breadcrumb.vue'
import Modal from '@/components/Modal.vue'

const route = useRoute()
const blockId = Number(route.params.id)

const loading = ref(true)
const error = ref('')
const block = ref(null)
const success = ref('')

const sortedModules = computed(() =>
    [...(block.value?.modules || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
)

// Formulaire (création / modification)
const showForm = ref(false)
const editingId = ref(null)
const form = reactive({name: '', description: '', position: null})
const formError = ref('')
const saving = ref(false)
const formTitle = computed(() => (editingId.value ? 'Modifier le module' : 'Nouveau module'))

function nextPosition() {
  const positions = sortedModules.value.map((m) => m.position ?? 0)
  return positions.length ? Math.max(...positions) + 1 : 1
}

function openCreate() {
  editingId.value = null
  form.name = ''
  form.description = ''
  form.position = nextPosition()
  formError.value = ''
  showForm.value = true
}

function openEdit(module) {
  editingId.value = module.id
  form.name = module.name || ''
  form.description = module.description || ''
  form.position = module.position ?? 0
  formError.value = ''
  showForm.value = true
}

async function save() {
  formError.value = ''
  const name = form.name.trim()
  if (name.length < 2 || name.length > 255) {
    formError.value = 'Le nom doit contenir entre 2 et 255 caractères.'
    return
  }
  if (form.description && form.description.length > 500) {
    formError.value = 'La description ne doit pas dépasser 500 caractères.'
    return
  }
  const position = form.position === null || form.position === '' ? null : Number(form.position)
  if (position !== null && (Number.isNaN(position) || position < 0)) {
    formError.value = 'La position doit être un entier positif ou nul.'
    return
  }
  saving.value = true
  try {
    const payload = {name, description: form.description.trim() || null, blockId, position}
    if (editingId.value) {
      await moduleService.updateModule(editingId.value, payload)
      success.value = 'Module modifié avec succès.'
    } else {
      await moduleService.createModule(payload)
      success.value = 'Module créé avec succès.'
    }
    showForm.value = false
    await load()
  } catch (err) {
    formError.value = err.message || "L'enregistrement a échoué."
  } finally {
    saving.value = false
  }
}

// Suppression
const showDelete = ref(false)
const deleting = ref(null)
const deleteError = ref('')
const removing = ref(false)

function openDelete(module) {
  deleting.value = module
  deleteError.value = ''
  showDelete.value = true
}

async function confirmDelete() {
  deleteError.value = ''
  removing.value = true
  try {
    await moduleService.deleteModule(deleting.value.id)
    success.value = 'Module supprimé.'
    showDelete.value = false
    deleting.value = null
    await load()
  } catch (err) {
    deleteError.value = err.message || 'La suppression a échoué.'
  } finally {
    removing.value = false
  }
}

// Prérequis
const showPrereq = ref(false)
const prereqModule = ref(null)
const prereqSelected = ref(new Set())
const prereqError = ref('')
const loadingPrereq = ref(false)
const savingPrereq = ref(false)

const prereqCandidates = computed(() =>
    sortedModules.value.filter((m) => m.id !== prereqModule.value?.id)
)

async function openPrereq(module) {
  prereqModule.value = module
  prereqError.value = ''
  prereqSelected.value = new Set()
  showPrereq.value = true
  loadingPrereq.value = true
  try {
    const current = await moduleService.getPrerequisites(module.id)
    prereqSelected.value = new Set(current.map((p) => p.id))
  } catch (err) {
    prereqError.value = err.message || 'Impossible de charger les prérequis.'
  } finally {
    loadingPrereq.value = false
  }
}

function togglePrereq(id) {
  const set = new Set(prereqSelected.value)
  if (set.has(id)) {
    set.delete(id)
  } else {
    set.add(id)
  }
  prereqSelected.value = set
}

async function savePrereq() {
  prereqError.value = ''
  savingPrereq.value = true
  try {
    await moduleService.updatePrerequisites(prereqModule.value.id, [...prereqSelected.value])
    success.value = 'Prérequis mis à jour.'
    showPrereq.value = false
  } catch (err) {
    prereqError.value = err.message || 'La mise à jour des prérequis a échoué.'
  } finally {
    savingPrereq.value = false
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    block.value = await blockService.getBlock(blockId)
  } catch (err) {
    error.value = err.message || 'Impossible de charger le bloc.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div v-if="loading" class="text-[15px] text-muted py-10 text-center">Chargement du bloc...</div>
  <div v-else-if="error" class="text-[15px] text-danger bg-danger/8 rounded-[10px] px-4 py-3">{{ error }}</div>

  <template v-else-if="block">
    <Breadcrumb :items="[{ label: 'Contenus', to: '/formateur/contenus' }, { label: block.name }]"/>

    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h1 class="text-[30px] font-semibold text-navy">{{ block.name }}</h1>
        <p class="text-ink-soft mt-1">Modules du bloc</p>
      </div>
      <button
          class="h-10 px-5 rounded-[10px] bg-primary text-white text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity self-start"
          @click="openCreate"
      >
        <Icon name="add" :size="18"/>
        Nouveau module
      </button>
    </div>

    <p v-if="success" class="text-[14px] text-success bg-success/10 rounded-[10px] px-4 py-2.5 mb-5">{{ success }}</p>

    <div v-if="sortedModules.length === 0" class="text-[15px] text-muted py-10 text-center">
      Aucun module dans ce bloc. Créez le premier.
    </div>

    <div v-else class="flex flex-col gap-3">
      <div
          v-for="module in sortedModules"
          :key="module.id"
          class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-5 flex flex-col sm:flex-row sm:items-center gap-4"
      >
        <div
            class="w-10 h-10 rounded-full bg-primary text-white font-semibold flex items-center justify-center shrink-0">
          {{ module.position }}
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="text-[17px] font-semibold text-ink">{{ module.name }}</h3>
          <p class="text-[13px] text-ink-soft line-clamp-1">{{ module.description || 'Aucune description.' }}</p>
          <div class="flex flex-wrap gap-2 mt-2">
            <StatusChip :label="`${module.courseCount} cours`" variant="primary"/>
            <StatusChip :label="`${module.exerciseCount} exercices`" variant="primary"/>
            <StatusChip v-if="module.hasQuiz" label="1 quiz" variant="primary"/>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <RouterLink
              :to="`/formateur/contenus/modules/${module.id}`"
              class="h-9 px-3 rounded-[10px] bg-primary text-white text-sm font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity"
          >
            <Icon name="folder_open" :size="16"/>
            Gérer
          </RouterLink>
          <button
              class="h-9 px-3 rounded-[10px] border border-input text-primary text-sm font-semibold flex items-center gap-1.5 hover:bg-surface-tint transition-colors"
              @click="openPrereq(module)"
          >
            <Icon name="account_tree" :size="16"/>
            Prérequis
          </button>
          <button
              class="h-9 w-9 rounded-[10px] border border-input text-primary flex items-center justify-center hover:bg-surface-tint transition-colors"
              aria-label="Modifier"
              @click="openEdit(module)"
          >
            <Icon name="edit" :size="16"/>
          </button>
          <button
              class="h-9 w-9 rounded-[10px] border border-danger text-danger flex items-center justify-center hover:bg-danger/8 transition-colors"
              aria-label="Supprimer"
              @click="openDelete(module)"
          >
            <Icon name="delete" :size="16"/>
          </button>
        </div>
      </div>
    </div>
  </template>

  <!-- Modale formulaire -->
  <Modal v-if="showForm" @close="showForm = false">
    <div class="px-6 pt-6 pb-6 w-full max-w-[480px]">
      <h3 class="text-[20px] font-semibold text-navy mb-5">{{ formTitle }}</h3>
      <div class="flex flex-col gap-4">
        <div>
          <label class="block text-[13px] font-medium text-ink-soft mb-1.5">Nom du module</label>
          <input
              v-model="form.name"
              type="text"
              maxlength="255"
              placeholder="Ex : Introduction aux processus"
              class="w-full h-10 px-3 border border-input rounded-[10px] text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>
        <div>
          <label class="block text-[13px] font-medium text-ink-soft mb-1.5">Description (facultative)</label>
          <textarea
              v-model="form.description"
              rows="3"
              maxlength="500"
              placeholder="Décrivez le module..."
              class="w-full border border-input rounded-[10px] px-3 py-2 text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors resize-none"
          ></textarea>
        </div>
        <div>
          <label class="block text-[13px] font-medium text-ink-soft mb-1.5">Position (ordre dans le bloc)</label>
          <input
              v-model="form.position"
              type="number"
              min="0"
              class="w-full h-10 px-3 border border-input rounded-[10px] text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>
        <p v-if="formError" class="text-[13px] text-danger">{{ formError }}</p>
        <div class="flex justify-end gap-3 mt-1">
          <button type="button"
                  class="h-10 px-4 rounded-[10px] border border-input text-ink text-sm font-semibold hover:bg-surface-tint transition-colors"
                  @click="showForm = false">
            Annuler
          </button>
          <button type="button" :disabled="saving"
                  class="h-10 px-5 rounded-[10px] bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
                  @click="save">
            {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
          </button>
        </div>
      </div>
    </div>
  </Modal>

  <!-- Modale prérequis -->
  <Modal v-if="showPrereq" @close="showPrereq = false">
    <div class="px-6 pt-6 pb-6 w-full max-w-[480px]">
      <h3 class="text-[20px] font-semibold text-navy mb-1">Prérequis du module</h3>
      <p class="text-[14px] text-ink-soft mb-4">{{ prereqModule?.name }}</p>

      <div v-if="loadingPrereq" class="text-[14px] text-muted py-4 text-center">Chargement...</div>
      <template v-else>
        <p v-if="prereqCandidates.length === 0" class="text-[14px] text-muted mb-4">
          Aucun autre module disponible comme prérequis.
        </p>
        <div v-else class="flex flex-col gap-2 mb-4 max-h-[320px] overflow-y-auto">
          <label
              v-for="candidate in prereqCandidates"
              :key="candidate.id"
              class="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors"
              :class="prereqSelected.has(candidate.id) ? 'bg-accent/15' : 'bg-background hover:bg-surface-tint'"
          >
            <input
                type="checkbox"
                class="w-4 h-4 accent-[var(--color-primary)]"
                :checked="prereqSelected.has(candidate.id)"
                @change="togglePrereq(candidate.id)"
            />
            <span class="text-[14px] text-ink">{{ candidate.position }}. {{ candidate.name }}</span>
          </label>
        </div>

        <p v-if="prereqError" class="text-[13px] text-danger mb-3">{{ prereqError }}</p>

        <div class="flex justify-end gap-3">
          <button type="button"
                  class="h-10 px-4 rounded-[10px] border border-input text-ink text-sm font-semibold hover:bg-surface-tint transition-colors"
                  @click="showPrereq = false">
            Annuler
          </button>
          <button type="button" :disabled="savingPrereq"
                  class="h-10 px-5 rounded-[10px] bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
                  @click="savePrereq">
            {{ savingPrereq ? 'Enregistrement...' : 'Enregistrer' }}
          </button>
        </div>
      </template>
    </div>
  </Modal>

  <!-- Modale suppression -->
  <Modal v-if="showDelete" @close="showDelete = false">
    <div class="px-6 pt-6 pb-6 w-full max-w-[420px] text-center">
      <div class="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto mb-4">
        <Icon name="warning" :size="26"/>
      </div>
      <h3 class="text-[18px] font-semibold text-navy mb-2">Supprimer le module</h3>
      <p class="text-[14px] text-ink-soft mb-4">
        Confirmez-vous la suppression du module <strong>{{ deleting?.name }}</strong> ? Cette action est irréversible.
      </p>
      <p v-if="deleteError" class="text-[13px] text-danger mb-4">{{ deleteError }}</p>
      <div class="flex justify-center gap-3">
        <button type="button"
                class="h-10 px-4 rounded-[10px] border border-input text-ink text-sm font-semibold hover:bg-surface-tint transition-colors"
                @click="showDelete = false">
          Annuler
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
