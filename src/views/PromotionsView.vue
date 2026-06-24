<script setup>
// Espace admin : gestion des promotions. Liste, création, édition, suppression,
// bascule active, et consultation des membres. S'appuie sur promotionService
// (/api/promos). La liste ne porte que le comptage ; les membres sont chargés
// à la demande via GET /api/promos/{id}.
import {ref, reactive, computed, onMounted} from 'vue'
import {formatDate} from '@/utils/date'
import {promotionService} from '@/services/promotionService'
import Icon from '@/components/Icon.vue'
import StatusChip from '@/components/StatusChip.vue'
import Modal from '@/components/Modal.vue'

const loading = ref(true)
const error = ref('')
const message = ref('')

const rows = ref([])
const search = ref('')

// Formulaire création / édition
const showForm = ref(false)
const editing = ref(null)
const form = reactive({name: '', startDate: '', endDate: ''})
const formError = ref('')
const saving = ref(false)

// Suppression
const showDelete = ref(false)
const deleting = ref(null)
const removing = ref(false)
const deleteError = ref('')

// Membres
const showMembers = ref(false)
const membersPromo = ref(null)
const members = ref([])
const loadingMembers = ref(false)
const membersError = ref('')

const formTitle = computed(() => (editing.value ? 'Modifier la promotion' : 'Nouvelle promotion'))

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) {
    return rows.value
  }
  return rows.value.filter((p) => (p.name || '').toLowerCase().includes(term))
})

function period(promo) {
  const start = formatDate(promo.startDate, {fallback: null})
  const end = formatDate(promo.endDate, {fallback: null})
  if (start && end) {
    return `du ${start} au ${end}`
  }
  if (start) {
    return `à partir du ${start}`
  }
  if (end) {
    return `jusqu'au ${end}`
  }
  return 'Non définie'
}

function flashMessage(text) {
  message.value = text
  setTimeout(() => {
    if (message.value === text) {
      message.value = ''
    }
  }, 3000)
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const page = await promotionService.getPromotions()
    rows.value = page.items
  } catch (err) {
    error.value = err.message || 'Impossible de charger les promotions.'
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  form.name = ''
  form.startDate = ''
  form.endDate = ''
  formError.value = ''
  showForm.value = true
}

function openEdit(promo) {
  editing.value = promo
  form.name = promo.name
  form.startDate = promo.startDate || ''
  form.endDate = promo.endDate || ''
  formError.value = ''
  showForm.value = true
}

async function submitForm() {
  formError.value = ''
  if (!form.name.trim()) {
    formError.value = 'Le nom de la promotion est obligatoire.'
    return
  }
  if (form.startDate && form.endDate && form.startDate > form.endDate) {
    formError.value = 'La date de fin doit être postérieure à la date de début.'
    return
  }
  saving.value = true
  const payload = {
    name: form.name.trim(),
    startDate: form.startDate || null,
    endDate: form.endDate || null
  }
  try {
    if (editing.value) {
      await promotionService.updatePromotion(editing.value.id, payload)
      flashMessage('Promotion mise à jour.')
    } else {
      await promotionService.createPromotion(payload)
      flashMessage('Promotion créée.')
    }
    showForm.value = false
    await load()
  } catch (err) {
    formError.value = err.message || "L'enregistrement a échoué."
  } finally {
    saving.value = false
  }
}

function askDelete(promo) {
  deleting.value = promo
  deleteError.value = ''
  showDelete.value = true
}

async function confirmDelete() {
  deleteError.value = ''
  removing.value = true
  try {
    await promotionService.deletePromotion(deleting.value.id)
    rows.value = rows.value.filter((p) => p.id !== deleting.value.id)
    flashMessage('Promotion supprimée.')
    showDelete.value = false
  } catch (err) {
    deleteError.value = err.message || 'La suppression a échoué.'
  } finally {
    removing.value = false
  }
}

async function toggleActive(promo) {
  try {
    const updated = await promotionService.toggleActive(promo.id)
    promo.active = updated.active
    flashMessage(`${promo.name} est désormais ${updated.active ? 'active' : 'inactive'}.`)
  } catch (err) {
    error.value = err.message || "Le changement d'état a échoué."
  }
}

async function openMembers(promo) {
  membersPromo.value = promo
  members.value = []
  membersError.value = ''
  showMembers.value = true
  loadingMembers.value = true
  try {
    const detail = await promotionService.getPromotion(promo.id)
    members.value = detail.users || []
  } catch (err) {
    membersError.value = err.message || 'Impossible de charger les membres.'
  } finally {
    loadingMembers.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
    <h1 class="text-[30px] font-semibold text-navy">Promotions</h1>
    <button
        type="button"
        class="h-10 px-4 rounded-[10px] bg-primary text-white text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity self-start"
        @click="openCreate"
    >
      <Icon name="add" :size="20"/>
      Nouvelle promotion
    </button>
  </div>

  <p v-if="message" class="text-[14px] text-success bg-success/10 rounded-[10px] px-4 py-2.5 mb-5">{{ message }}</p>

  <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-4 flex mb-6">
    <div class="flex items-center gap-2 flex-1 h-10 px-3 border border-input rounded-[10px] bg-white">
      <Icon name="search" :size="20" class="text-muted"/>
      <input v-model="search" placeholder="Rechercher une promotion"
             class="flex-1 outline-none text-[14px] bg-transparent"/>
    </div>
  </div>

  <div v-if="loading" class="text-[15px] text-muted py-10 text-center">Chargement des promotions...</div>
  <div v-else-if="error" class="text-[15px] text-danger bg-danger/8 rounded-[10px] px-4 py-3">{{ error }}</div>

  <div v-else class="bg-surface rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
    <p v-if="filtered.length === 0" class="px-5 py-8 text-[15px] text-muted text-center">Aucune promotion à
      afficher.</p>
    <table v-else class="w-full text-[14px]">
      <thead>
      <tr class="bg-surface-tint text-[13px] text-ink-soft text-left">
        <th class="px-5 py-3 font-medium">Nom</th>
        <th class="px-5 py-3 font-medium">Période</th>
        <th class="px-5 py-3 font-medium">Apprenants</th>
        <th class="px-5 py-3 font-medium">Statut</th>
        <th class="px-5 py-3 font-medium text-right">Actions</th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="p in filtered" :key="p.id" class="border-t border-line-soft hover:bg-surface-hover transition-colors">
        <td class="px-5 py-3 text-ink font-medium">{{ p.name }}</td>
        <td class="px-5 py-3 text-ink-soft">{{ period(p) }}</td>
        <td class="px-5 py-3">
          <button class="text-primary hover:underline text-[13px] font-semibold" @click="openMembers(p)">
            {{ p.userCount ?? 0 }} apprenant(s)
          </button>
        </td>
        <td class="px-5 py-3">
          <StatusChip :label="p.active ? 'Active' : 'Inactive'" :variant="p.active ? 'success' : 'neutral'"/>
        </td>
        <td class="px-5 py-3 text-right">
          <div class="flex items-center justify-end gap-1">
            <button class="p-2 rounded-full text-ink-soft hover:bg-surface-tint transition-colors" title="Modifier"
                    @click="openEdit(p)">
              <Icon name="edit" :size="18"/>
            </button>
            <button
                class="p-2 rounded-full transition-colors"
                :class="p.active ? 'text-ink-soft hover:bg-surface-tint' : 'text-[#16a34a] hover:bg-[#16a34a]/8'"
                :title="p.active ? 'Désactiver' : 'Activer'"
                @click="toggleActive(p)"
            >
              <Icon name="power_settings_new" :size="18"/>
            </button>
            <button class="p-2 rounded-full text-[#ba1a1a] hover:bg-[#ba1a1a]/8 transition-colors" title="Supprimer"
                    @click="askDelete(p)">
              <Icon name="delete" :size="18"/>
            </button>
          </div>
        </td>
      </tr>
      </tbody>
    </table>
  </div>

  <!-- Modale création / édition -->
  <Modal v-if="showForm" @close="showForm = false">
    <div class="px-6 pt-6 pb-6 w-full max-w-[480px]">
      <h3 class="text-[20px] font-semibold text-navy mb-5">{{ formTitle }}</h3>
      <div class="flex flex-col gap-4">
        <div>
          <label class="block text-[13px] font-medium text-ink-soft mb-1.5">Nom de la promotion</label>
          <input
              v-model="form.name"
              type="text"
              maxlength="100"
              placeholder="Ex : Promotion 2026"
              class="w-full h-10 px-3 border border-input rounded-[10px] text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-[13px] font-medium text-ink-soft mb-1.5">Début (facultatif)</label>
            <input v-model="form.startDate" type="date"
                   class="w-full h-10 px-3 border border-input rounded-[10px] text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"/>
          </div>
          <div>
            <label class="block text-[13px] font-medium text-ink-soft mb-1.5">Fin (facultatif)</label>
            <input v-model="form.endDate" type="date"
                   class="w-full h-10 px-3 border border-input rounded-[10px] text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"/>
          </div>
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
                  @click="submitForm">
            {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
          </button>
        </div>
      </div>
    </div>
  </Modal>

  <!-- Modale de confirmation de suppression -->
  <Modal v-if="showDelete" @close="showDelete = false">
    <div class="px-6 pt-6 pb-6 w-full max-w-[420px] text-center">
      <div class="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto mb-4">
        <Icon name="warning" :size="26"/>
      </div>
      <h3 class="text-[18px] font-semibold text-navy mb-2">Supprimer la promotion</h3>
      <p class="text-[14px] text-ink-soft mb-4">
        Confirmez-vous la suppression de la promotion <strong>{{ deleting?.name }}</strong> ? Cette action est
        irréversible.
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

  <!-- Modale des membres -->
  <Modal v-if="showMembers" @close="showMembers = false">
    <div class="px-6 pt-6 pb-6 w-full max-w-[480px]">
      <h3 class="text-[18px] font-semibold text-navy mb-1">Membres de {{ membersPromo?.name }}</h3>
      <p class="text-[13px] text-muted mb-4">{{ members.length }} apprenant(s)</p>

      <div v-if="loadingMembers" class="text-[14px] text-muted py-6 text-center">Chargement...</div>
      <p v-else-if="membersError" class="text-[13px] text-danger">{{ membersError }}</p>
      <p v-else-if="members.length === 0" class="text-[14px] text-muted py-4 text-center">Aucun apprenant dans cette
        promotion.</p>
      <div v-else class="flex flex-col gap-1 max-h-72 overflow-auto">
        <div v-for="m in members" :key="m.id" class="flex flex-col px-3 py-2 rounded-lg hover:bg-surface-tint">
          <span class="text-[14px] text-ink">{{ m.firstName }} {{ m.lastName }}</span>
          <span class="text-[12px] text-muted">{{ m.email }}</span>
        </div>
      </div>
    </div>
  </Modal>
</template>
