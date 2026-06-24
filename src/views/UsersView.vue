<script setup>
// Espace admin : gestion des utilisateurs. Liste réelle (actifs ou supprimés),
// recherche, filtres rôle et statut, et actions de cycle de vie (activer/désactiver,
// supprimer logiquement, restaurer).
import {computed, onMounted, ref} from 'vue'
import {roleChip} from '@/utils/roles'
import {formatDate} from '@/utils/date'
import {userService} from '@/services/userService'
import {useAuthStore} from '@/stores/auth'
import Icon from '@/components/Icon.vue'
import StatusChip from '@/components/StatusChip.vue'
import Avatar from '@/components/Avatar.vue'
import Modal from '@/components/Modal.vue'

const auth = useAuthStore()

const loading = ref(true)
const error = ref('')
const message = ref('')

const rows = ref([])
const showDeleted = ref(false)
const search = ref('')
const roleFilter = ref('ALL')
const statusFilter = ref('ALL')

const showDelete = ref(false)
const deleting = ref(null)
const removing = ref(false)
const deleteError = ref('')

function isSelf(user) {
  return auth.user && user.id === auth.user.id
}

function fullName(user) {
  return `${user.firstName} ${user.lastName}`
}

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase()
  return rows.value.filter((u) => {
    if (term && !fullName(u).toLowerCase().includes(term) && !(u.email || '').toLowerCase().includes(term)) {
      return false
    }
    if (roleFilter.value !== 'ALL' && u.role !== roleFilter.value) {
      return false
    }
    if (!showDeleted.value && statusFilter.value !== 'ALL') {
      const wantActive = statusFilter.value === 'ACTIVE'
      if (Boolean(u.enabled) !== wantActive) {
        return false
      }
    }
    return true
  })
})

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
    const page = showDeleted.value ? await userService.getDeletedUsers() : await userService.getUsers()
    rows.value = page.items
  } catch (err) {
    error.value = err.message || 'Impossible de charger les utilisateurs.'
  } finally {
    loading.value = false
  }
}

async function switchView(deleted) {
  if (showDeleted.value === deleted) {
    return
  }
  showDeleted.value = deleted
  statusFilter.value = 'ALL'
  await load()
}

async function toggleEnabled(user) {
  if (isSelf(user)) {
    return
  }
  try {
    const updated = await userService.toggleEnabled(user.id)
    user.enabled = updated.enabled
    flashMessage(`${fullName(user)} est désormais ${updated.enabled ? 'actif' : 'désactivé'}.`)
  } catch (err) {
    error.value = err.message || "Le changement d'état a échoué."
  }
}

function askDelete(user) {
  if (isSelf(user)) {
    return
  }
  deleting.value = user
  deleteError.value = ''
  showDelete.value = true
}

async function confirmDelete() {
  deleteError.value = ''
  removing.value = true
  try {
    await userService.deleteUser(deleting.value.id)
    rows.value = rows.value.filter((u) => u.id !== deleting.value.id)
    flashMessage(`${fullName(deleting.value)} a été supprimé.`)
    showDelete.value = false
  } catch (err) {
    deleteError.value = err.message || 'La suppression a échoué.'
  } finally {
    removing.value = false
  }
}

async function restoreUser(user) {
  try {
    await userService.restoreUser(user.id)
    rows.value = rows.value.filter((u) => u.id !== user.id)
    flashMessage(`${fullName(user)} a été restauré.`)
  } catch (err) {
    error.value = err.message || 'La restauration a échoué.'
  }
}

onMounted(load)
</script>

<template>
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
    <h1 class="text-[30px] font-semibold text-navy">Gestion des utilisateurs</h1>
    <RouterLink
      to="/admin/utilisateurs/nouveau"
      class="h-10 px-4 rounded-[10px] bg-primary text-white text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity self-start"
    >
      <Icon name="add" :size="20"/>
      Nouvel utilisateur
    </RouterLink>
  </div>

  <!-- Bascule actifs / supprimés -->
  <div class="flex gap-1 mb-5 border-b border-line">
    <button
      type="button"
      class="px-4 py-2.5 text-[14px] font-medium border-b-2 -mb-px transition-colors"
      :class="!showDeleted ? 'border-primary text-primary' : 'border-transparent text-ink-soft hover:text-ink'"
      @click="switchView(false)"
    >
      Comptes actifs
    </button>
    <button
      type="button"
      class="px-4 py-2.5 text-[14px] font-medium border-b-2 -mb-px transition-colors"
      :class="showDeleted ? 'border-primary text-primary' : 'border-transparent text-ink-soft hover:text-ink'"
      @click="switchView(true)"
    >
      Corbeille
    </button>
  </div>

  <p v-if="message" class="text-[14px] text-success bg-success/10 rounded-[10px] px-4 py-2.5 mb-5">{{ message }}</p>

  <!-- Barre d'outils -->
  <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-4 flex flex-wrap items-center gap-3 mb-6">
    <div class="flex items-center gap-2 flex-1 min-w-[200px] h-10 px-3 border border-input rounded-[10px] bg-white">
      <Icon name="search" :size="20" class="text-muted"/>
      <input v-model="search" placeholder="Rechercher par nom ou e-mail"
             class="flex-1 outline-none text-[14px] bg-transparent"/>
    </div>
    <select v-model="roleFilter" class="h-10 px-3 border border-input rounded-[10px] text-[14px] text-ink bg-white">
      <option value="ALL">Rôle : tous</option>
      <option value="ADMIN">Admin</option>
      <option value="TEACHER">Formateur</option>
      <option value="USER">Apprenant</option>
    </select>
    <select v-if="!showDeleted" v-model="statusFilter"
            class="h-10 px-3 border border-input rounded-[10px] text-[14px] text-ink bg-white">
      <option value="ALL">Statut : tous</option>
      <option value="ACTIVE">Actifs</option>
      <option value="INACTIVE">Désactivés</option>
    </select>
  </div>

  <div v-if="loading" class="text-[15px] text-muted py-10 text-center">Chargement des utilisateurs...</div>
  <div v-else-if="error" class="text-[15px] text-danger bg-danger/8 rounded-[10px] px-4 py-3">{{ error }}</div>

  <!-- Table -->
  <div v-else class="bg-surface rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
    <p v-if="filtered.length === 0" class="px-5 py-8 text-[15px] text-muted text-center">
      {{ showDeleted ? 'La corbeille est vide.' : 'Aucun utilisateur à afficher.' }}
    </p>
    <table v-else class="w-full text-[14px]">
      <thead>
      <tr class="bg-surface-tint text-[13px] text-ink-soft text-left">
        <th class="px-5 py-3 font-medium">Utilisateur</th>
        <th class="px-5 py-3 font-medium">Rôle</th>
        <th class="px-5 py-3 font-medium">Promotion</th>
        <th class="px-5 py-3 font-medium">Statut</th>
        <th class="px-5 py-3 font-medium">Inscrit le</th>
        <th class="px-5 py-3 font-medium text-right">Actions</th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="u in filtered" :key="u.id" class="border-t border-line-soft hover:bg-surface-hover transition-colors">
        <td class="px-5 py-3">
          <div class="flex items-center gap-2.5">
            <Avatar :src="u.avatar" :name="fullName(u)" :size="36"/>
            <div class="min-w-0">
              <span class="text-ink block truncate">{{ fullName(u) }}</span>
              <span class="text-[12px] text-muted">{{ u.email }}</span>
            </div>
          </div>
        </td>
        <td class="px-5 py-3">
          <StatusChip v-bind="roleChip(u.role)"/>
        </td>
        <td class="px-5 py-3 text-ink-soft">{{ u.promotionName || '-' }}</td>
        <td class="px-5 py-3">
          <StatusChip v-if="showDeleted" label="Supprimé" variant="neutral"/>
          <span v-else class="flex items-center gap-1.5 text-[13px]"
                :class="u.enabled ? 'text-[#16a34a]' : 'text-muted'">
              <span class="w-2 h-2 rounded-full" :class="u.enabled ? 'bg-[#16a34a]' : 'bg-muted'"></span>
              {{ u.enabled ? 'Actif' : 'Désactivé' }}
            </span>
        </td>
        <td class="px-5 py-3 text-ink-soft">{{ formatDate(u.createdAt, {fallback: '-'}) }}</td>
        <td class="px-5 py-3 text-right">
          <div class="flex items-center justify-end gap-1">
            <template v-if="showDeleted">
              <button class="text-primary text-[13px] font-semibold hover:underline" @click="restoreUser(u)">Restaurer
              </button>
            </template>
            <template v-else>
              <RouterLink
                :to="`/admin/utilisateurs/${u.id}`"
                class="text-ink-soft hover:bg-surface-tint p-2 rounded-full transition-colors inline-flex"
                title="Voir et modifier"
              >
                <Icon name="edit" :size="18"/>
              </RouterLink>
              <button
                class="p-2 rounded-full transition-colors"
                :class="isSelf(u) ? 'text-line cursor-not-allowed' : 'text-ink-soft hover:bg-surface-tint'"
                :disabled="isSelf(u)"
                :title="u.enabled ? 'Désactiver' : 'Activer'"
                @click="toggleEnabled(u)"
              >
                <Icon name="power_settings_new" :size="18"/>
              </button>
              <button
                class="p-2 rounded-full transition-colors"
                :class="isSelf(u) ? 'text-line cursor-not-allowed' : 'text-[#ba1a1a] hover:bg-[#ba1a1a]/8'"
                :disabled="isSelf(u)"
                title="Supprimer"
                @click="askDelete(u)"
              >
                <Icon name="delete" :size="18"/>
              </button>
            </template>
          </div>
        </td>
      </tr>
      </tbody>
    </table>
  </div>

  <!-- Modale de confirmation de suppression -->
  <Modal v-if="showDelete" @close="showDelete = false">
    <div class="px-6 pt-6 pb-6 w-full max-w-[420px] text-center">
      <div class="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto mb-4">
        <Icon name="warning" :size="26"/>
      </div>
      <h3 class="text-[18px] font-semibold text-navy mb-2">Supprimer l'utilisateur</h3>
      <p class="text-[14px] text-ink-soft mb-4">
        Confirmez-vous la suppression du compte de <strong>{{ deleting ? fullName(deleting) : '' }}</strong> ? Il pourra
        être restauré depuis la corbeille.
      </p>
      <p v-if="deleteError" class="text-[13px] text-danger mb-4">{{ deleteError }}</p>
      <div class="flex justify-center gap-3">
        <button
          type="button"
          class="h-10 px-4 rounded-[10px] border border-input text-ink text-sm font-semibold hover:bg-surface-tint transition-colors"
          @click="showDelete = false"
        >
          Annuler
        </button>
        <button
          type="button"
          :disabled="removing"
          class="h-10 px-5 rounded-[10px] bg-danger text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
          @click="confirmDelete"
        >
          {{ removing ? 'Suppression...' : 'Supprimer' }}
        </button>
      </div>
    </div>
  </Modal>
</template>
