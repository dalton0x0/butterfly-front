<script setup>
// Espace admin : page détail et édition d'un utilisateur.
import {computed, onMounted, reactive, ref, watch} from 'vue'
import {canManageAccount, grantableRoles, hasGlobalScope, roleChip as roleChipFor, ROLES} from '@/utils/roles'
import {useRoute} from 'vue-router'
import {userService} from '@/services/userService'
import {promotionService} from '@/services/promotionService'
import {blockService} from '@/services/blockService'
import {useAuthStore} from '@/stores/auth'
import {useAsyncTask} from '@/composables/useAsyncTask'
import {useDebouncedRef} from '@/composables/useDebouncedRef'
import Breadcrumb from '@/components/Breadcrumb.vue'
import Icon from '@/components/Icon.vue'
import Avatar from '@/components/Avatar.vue'
import StatusChip from '@/components/StatusChip.vue'
import Modal from '@/components/Modal.vue'

const route = useRoute()
const auth = useAuthStore()

const userId = computed(() => Number(route.params.id))
const isSelf = computed(() => auth.user && auth.user.id === userId.value)

const loading = ref(true)
const error = ref('')
const message = ref('')

const user = ref(null)
const promotions = ref([])
const blocks = ref([])
// Nombre total de blocs correspondant au filtre : sert à signaler une liste incomplète.
const blocksTotal = ref(0)

// Formulaires de chaque section
const identity = reactive({firstName: '', lastName: '', email: ''})
const selectedRole = ref(ROLES.USER)
const selectedPromotionId = ref('')
const selectedBlockIds = ref([])

// Indicateurs de sauvegarde par section
const savingIdentity = ref(false)
const savingRole = ref(false)
const savingStatus = ref(false)
const savingInvitation = ref(false)
const savingPasswordReset = ref(false)
const savingPromotion = ref(false)
const savingBlocks = ref(false)
const savingOwnership = ref(false)
const showTransfer = ref(false)

// Compte que l'utilisateur connecté ne peut pas modifier : le propriétaire, ou un autre
// administrateur quand on n'est pas propriétaire. Le back refuse de toute façon : l'écran
// le dit avant le clic plutôt qu'après.
const locked = computed(() => !canManageAccount(auth.user, user.value))
const lockReason = computed(() => (user.value?.owner
  ? 'Compte propriétaire de la plateforme : seul son titulaire peut le modifier.'
  : 'Seul le propriétaire de la plateforme gère les comptes administrateurs.'))

// Rôles proposés : ceux que l'on peut attribuer, plus le rôle actuel pour l'afficher.
const roleChoices = computed(() => {
  const roles = grantableRoles(auth.role, auth.isOwner)
  return !user.value || roles.includes(user.value.role) ? roles : [...roles, user.value.role]
})

// Transfert de propriété : vers un autre administrateur actif dont le compte est activé.
const canReceiveOwnership = computed(() =>
  user.value?.enabled && !user.value?.pendingActivation)

const roleChip = computed(() => roleChipFor(user.value?.role))
const fullName = computed(() => (user.value ? `${user.value.firstName} ${user.value.lastName}` : ''))

// Filtre de l'écran d'assignation. La recherche part au serveur : avec de nombreux
// blocs, la liste complète ne tient pas dans une page et un bloc absent de la première
// page ne pouvait tout simplement pas être coché.
const blockSearch = ref('')
const debouncedBlockSearch = useDebouncedRef(blockSearch, 300)
const blockSearchTask = useAsyncTask('Impossible de rechercher les blocs.')

const displayedBlocks = computed(() => {
  const byId = new Map()
  for (const b of blocks.value) {
    byId.set(b.id, b)
  }
  // Les blocs déjà assignés restent visibles même hors de la page chargée pour pouvoir
  // les retirer. Pendant une recherche, seuls ceux qui correspondent au terme s'affichent.
  const filter = blockSearch.value.trim().toLowerCase()
  for (const b of (user.value?.blocks || [])) {
    if (!byId.has(b.id) && b.name.toLowerCase().includes(filter)) {
      byId.set(b.id, b)
    }
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
})

const blocksTruncated = computed(() => blocksTotal.value > blocks.value.length)

async function loadBlocks(search) {
  const page = await blockSearchTask.run(() => blockService.getBlocks({search: search || undefined}))
  if (page) {
    // Un bloc informatif est déjà visible par tous : le back refuse de l'assigner.
    const assignable = page.items.filter((b) => !b.informational)
    blocks.value = assignable
    blocksTotal.value = page.totalElements - (page.items.length - assignable.length)
  }
}

watch(debouncedBlockSearch, (value) => loadBlocks(value.trim()))

const assignedCount = computed(() => selectedBlockIds.value.length)

// État "modifié mais non enregistré" : compare la sélection courante à l'état sauvegardé.
const savedBlockIds = computed(() => new Set((user.value?.blocks || []).map((b) => b.id)))
const blocksDirty = computed(() => {
  const current = selectedBlockIds.value
  const saved = savedBlockIds.value
  if (current.length !== saved.size) {
    return true
  }
  return current.some((id) => !saved.has(id))
})

function flashMessage(text) {
  message.value = text
  setTimeout(() => {
    if (message.value === text) {
      message.value = ''
    }
  }, 3000)
}

function syncForm() {
  if (!user.value) {
    return
  }
  identity.firstName = user.value.firstName
  identity.lastName = user.value.lastName
  identity.email = user.value.email
  selectedRole.value = user.value.role
  selectedPromotionId.value = user.value.promotionId ?? ''
  selectedBlockIds.value = (user.value.blocks || []).map((b) => b.id)
}

async function loadUser() {
  user.value = await userService.getUser(userId.value)
  syncForm()
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [, promoPage] = await Promise.all([
      loadUser(),
      promotionService.getPromotions().catch(() => ({items: []})),
      loadBlocks('')
    ])
    promotions.value = promoPage.items
  } catch (err) {
    error.value = err.message || "Impossible de charger l'utilisateur."
  } finally {
    loading.value = false
  }
}

async function run(savingRef, action, successText) {
  error.value = ''
  savingRef.value = true
  try {
    await action()
    await loadUser()
    flashMessage(successText)
  } catch (err) {
    error.value = err.message || "L'opération a échoué."
  } finally {
    savingRef.value = false
  }
}

function saveIdentity() {
  run(savingIdentity, () => userService.updateUser(userId.value, {
    firstName: identity.firstName.trim(),
    lastName: identity.lastName.trim(),
    email: identity.email.trim()
  }), 'Identité mise à jour.')
}

function saveRole() {
  run(savingRole, () => userService.updateRole(userId.value, selectedRole.value), 'Rôle mis à jour.')
}

function toggleStatus() {
  run(savingStatus, () => userService.toggleEnabled(userId.value),
    user.value.enabled ? 'Compte désactivé.' : 'Compte activé.')
}

async function confirmTransfer() {
  showTransfer.value = false
  await run(savingOwnership, () => userService.transferOwnership(userId.value),
    `${fullName.value} est maintenant propriétaire de la plateforme.`)
  // Le profil connecté n'est plus propriétaire : l'écran doit le refléter aussitôt.
  await auth.refreshProfile()
}

function resendInvitation() {
  run(savingInvitation, () => userService.resendInvitation(userId.value), 'Invitation renvoyée.')
}

function sendPasswordReset() {
  run(savingPasswordReset, () => userService.sendPasswordReset(userId.value), 'Lien de réinitialisation envoyé.')
}

function savePromotion() {
  const promotionId = selectedPromotionId.value
  run(
    savingPromotion,
    () => (promotionId === '' || promotionId === null
      ? userService.removePromotion(userId.value)
      : userService.assignPromotion(userId.value, promotionId)),
    'Promotion mise à jour.'
  )
}

function toggleBlock(blockId) {
  const set = new Set(selectedBlockIds.value)
  if (set.has(blockId)) {
    set.delete(blockId)
  } else {
    set.add(blockId)
  }
  selectedBlockIds.value = [...set]
}

function saveBlocks() {
  run(savingBlocks, () => userService.assignBlocks(userId.value, selectedBlockIds.value), 'Blocs assignés mis à jour.')
}

onMounted(load)
</script>

<template>
  <Breadcrumb :items="[{ label: 'Utilisateurs', to: '/admin/utilisateurs' }, { label: fullName || 'Utilisateur' }]"/>

  <div v-if="loading" class="text-[15px] text-muted py-10 text-center">Chargement de l'utilisateur...</div>
  <div v-else-if="error && !user" class="text-[15px] text-danger bg-danger/8 rounded-[10px] px-4 py-3">{{ error }}</div>

  <template v-else-if="user">
    <!-- En-tête -->
    <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-6 mb-6">
      <div class="flex flex-col sm:flex-row sm:items-center gap-5">
        <Avatar :src="user.avatar" :name="fullName" :size="72"/>
        <div class="flex-1 min-w-0">
          <h1 class="text-[26px] font-semibold text-navy truncate">{{ fullName }}</h1>
          <p class="text-ink-soft truncate">{{ user.email }}</p>
          <div class="flex flex-wrap items-center gap-2 mt-2">
            <StatusChip v-bind="roleChip"/>
            <StatusChip v-if="user.owner" label="Propriétaire" variant="primary"/>
            <span class="flex items-center gap-1.5 text-[13px]" :class="user.enabled ? 'text-[#16a34a]' : 'text-muted'">
              <span class="w-2 h-2 rounded-full" :class="user.enabled ? 'bg-[#16a34a]' : 'bg-muted'"></span>
              {{ user.enabled ? 'Actif' : 'Désactivé' }}
            </span>
            <StatusChip v-if="user.pendingActivation" label="Invitation en attente" variant="warning"/>
            <StatusChip v-else-if="user.emailVerified === false" label="Adresse non confirmée" variant="warning"/>
          </div>
        </div>
      </div>
    </div>

    <p v-if="message" class="text-[14px] text-success bg-success/10 rounded-[10px] px-4 py-2.5 mb-5">{{ message }}</p>
    <p v-if="error" class="text-[14px] text-danger bg-danger/8 rounded-[10px] px-4 py-2.5 mb-5">{{ error }}</p>
    <p v-if="locked" class="text-[14px] text-ink-soft bg-surface-tint rounded-[10px] px-4 py-2.5 mb-5 flex items-center gap-2">
      <Icon name="lock" :size="18"/>
      {{ lockReason }}
    </p>

    <!-- Première rangée : deux cartes de même hauteur, l'identité à gauche, le rôle et le
         statut à droite. Les blocs assignés, la carte la plus longue, occupent toute la
         largeur en dessous : aucune colonne ne laisse de grand vide sous une carte courte. -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <!-- Identité, et promotion pour un apprenant -->
      <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-6">
        <h2 class="text-[17px] font-semibold text-ink mb-4">Identité</h2>
        <div class="flex flex-col gap-3">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[12px] font-semibold text-muted uppercase tracking-wide mb-1.5"
                     for="user-detail-first-name">Prénom</label>
              <input id="user-detail-first-name" v-model="identity.firstName"
                     class="w-full h-10 px-3 border border-input rounded-[10px] text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"/>
            </div>
            <div>
              <label class="block text-[12px] font-semibold text-muted uppercase tracking-wide mb-1.5"
                     for="user-detail-last-name">Nom</label>
              <input id="user-detail-last-name" v-model="identity.lastName"
                     class="w-full h-10 px-3 border border-input rounded-[10px] text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"/>
            </div>
          </div>
          <div>
            <label class="block text-[12px] font-semibold text-muted uppercase tracking-wide mb-1.5"
                   for="user-detail-email">E-mail</label>
            <input id="user-detail-email" v-model="identity.email" type="email"
                   class="w-full h-10 px-3 border border-input rounded-[10px] text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"/>
          </div>
          <div class="flex justify-end">
            <button :disabled="savingIdentity || locked"
                    class="h-10 px-5 rounded-[10px] bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
                    @click="saveIdentity">
              Enregistrer
            </button>
          </div>
        </div>

        <div v-if="user.role === ROLES.USER" class="border-t border-line-soft pt-4 mt-4">
          <h2 class="text-[12px] font-semibold text-muted uppercase tracking-wide mb-1.5">Promotion</h2>
          <label for="user-detail-promotion" class="sr-only">Promotion de l'apprenant</label>
          <div class="flex gap-2">
            <select id="user-detail-promotion" v-model="selectedPromotionId"
                    class="flex-1 h-10 px-3 border border-input rounded-[10px] text-[14px] text-ink bg-white">
              <option value="">Aucune promotion</option>
              <option v-for="p in promotions" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
            <button :disabled="savingPromotion"
                    class="h-10 px-4 rounded-[10px] bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
                    @click="savePromotion">
              Appliquer
            </button>
          </div>
        </div>
      </div>

      <!-- Rôle et statut -->
      <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-6">
        <h2 class="text-[17px] font-semibold text-ink mb-4">{{ auth.isAdmin ? 'Rôle et statut' : 'Statut' }}</h2>
        <div class="flex flex-col gap-4">
          <!-- Changer un rôle reste réservé à l'administrateur -->
          <div v-if="auth.isAdmin">
            <label for="user-detail-role"
                   class="block text-[12px] font-semibold text-muted uppercase tracking-wide mb-1.5">Rôle</label>
            <div class="flex gap-2">
              <select id="user-detail-role" v-model="selectedRole" :disabled="isSelf || locked"
                      class="flex-1 h-10 px-3 border border-input rounded-[10px] text-[14px] text-ink bg-white disabled:bg-surface-tint disabled:text-muted">
                <option v-for="r in roleChoices" :key="r" :value="r">{{ roleChipFor(r).label }}</option>
              </select>
              <button :disabled="savingRole || isSelf || locked || selectedRole === user.role"
                      class="h-10 px-4 rounded-[10px] bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                      @click="saveRole">
                Appliquer
              </button>
            </div>
            <p v-if="isSelf" class="text-[12px] text-muted mt-1.5">Vous ne pouvez pas modifier votre propre rôle.</p>
          </div>

          <div :class="auth.isAdmin ? 'border-t border-line-soft pt-4' : ''">
            <!-- Intitulé et non étiquette de formulaire -->
            <p class="block text-[12px] font-semibold text-muted uppercase tracking-wide mb-1.5">Statut du
              compte</p>
            <button
              :disabled="savingStatus || isSelf || locked"
              class="h-10 px-4 rounded-[10px] text-sm font-semibold border transition-colors flex items-center gap-2 disabled:opacity-50"
              :class="user.enabled ? 'border-danger text-danger hover:bg-danger/8' : 'border-[#16a34a] text-[#16a34a] hover:bg-[#16a34a]/8'"
              @click="toggleStatus"
            >
              <Icon name="power_settings_new" :size="18"/>
              {{ user.enabled ? 'Désactiver le compte' : 'Activer le compte' }}
            </button>
            <p v-if="isSelf" class="text-[12px] text-muted mt-1.5">Vous ne pouvez pas désactiver votre propre
              compte.</p>
          </div>

          <div v-if="user.pendingActivation" class="border-t border-line-soft pt-4">
            <p class="block text-[12px] font-semibold text-muted uppercase tracking-wide mb-1.5">Invitation</p>
            <p class="text-[13px] text-ink-soft mb-3">
              Ce compte n'est pas encore activé. Un nouveau lien remplace le précédent.
            </p>
            <button
              :disabled="savingInvitation || locked"
              class="h-10 px-4 rounded-[10px] text-sm font-semibold border border-primary text-primary hover:bg-primary/8 transition-colors flex items-center gap-2 disabled:opacity-50"
              @click="resendInvitation"
            >
              <Icon name="forward_to_inbox" :size="18"/>
              Renvoyer l'invitation
            </button>
          </div>

          <!-- Compte activé et actif : le serveur refuse l'envoi dans les autres cas -->
          <div v-else-if="user.enabled" class="border-t border-line-soft pt-4">
            <p class="block text-[12px] font-semibold text-muted uppercase tracking-wide mb-1.5">Mot de passe</p>
            <p class="text-[13px] text-ink-soft mb-3">
              L'utilisateur reçoit un lien pour choisir un nouveau mot de passe. L'actuel reste valable
              tant que le lien n'est pas utilisé.
            </p>
            <button
              :disabled="savingPasswordReset || locked"
              class="h-10 px-4 rounded-[10px] text-sm font-semibold border border-primary text-primary hover:bg-primary/8 transition-colors flex items-center gap-2 disabled:opacity-50"
              @click="sendPasswordReset"
            >
              <Icon name="lock_reset" :size="18"/>
              Envoyer un lien de réinitialisation
            </button>
          </div>

          <!-- Transfert de propriété : visible du seul propriétaire, sur un autre administrateur -->
          <div v-if="auth.isOwner && !isSelf && user.role === ROLES.ADMIN" class="border-t border-line-soft pt-4">
            <p class="block text-[12px] font-semibold text-muted uppercase tracking-wide mb-1.5">Propriété</p>
            <p class="text-[13px] text-ink-soft mb-3">
              Le propriétaire est le seul compte que personne ne peut rétrograder ni supprimer. Vous resterez
              administrateur, mais ce compte gérera désormais les autres administrateurs, vous compris.
            </p>
            <button
              :disabled="savingOwnership || !canReceiveOwnership"
              class="h-10 px-4 rounded-[10px] text-sm font-semibold border border-primary text-primary hover:bg-primary/8 transition-colors flex items-center gap-2 disabled:opacity-50"
              @click="showTransfer = true"
            >
              <Icon name="shield_person" :size="18"/>
              Transférer la propriété
            </button>
            <p v-if="!canReceiveOwnership" class="text-[12px] text-muted mt-1.5">
              Le compte doit être actif et activé pour recevoir la propriété.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Blocs assignés. Un administrateur ou un gestionnaire voit déjà tous les blocs :
         le back refuse de lui en assigner. -->
    <div v-if="!hasGlobalScope(user.role)" class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-6">
      <h2 class="text-[17px] font-semibold text-ink mb-1">Blocs assignés</h2>
      <p class="text-[13px] text-muted mb-1">Pour un formateur, définit sa portée pédagogique. Pour un apprenant, son
        inscription.</p>
      <p class="text-[13px] text-muted mb-4">
        {{ assignedCount }} bloc(s) assigné(s). Cochez pour assigner, décochez pour retirer, puis enregistrez.
      </p>
      <div class="relative mb-3">
        <label for="user-detail-block-search" class="sr-only">Rechercher un bloc</label>
        <Icon name="search" :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted"/>
        <input id="user-detail-block-search" v-model="blockSearch" type="search" autocomplete="off"
               placeholder="Rechercher un bloc..."
               class="w-full h-10 pl-9 pr-3 rounded-[10px] border border-input bg-white text-[14px] text-ink outline-none focus:border-primary"/>
      </div>
      <p v-if="blockSearchTask.error.value" class="text-[13px] text-danger mb-2">{{ blockSearchTask.error.value }}</p>
      <p v-if="blocksTruncated" class="text-[13px] text-[#b45309] mb-2">
        {{ blocksTotal }} blocs correspondent, seuls les {{ blocks.length }} premiers sont affichés.
        Affinez la recherche pour trouver les autres.
      </p>
      <p v-if="displayedBlocks.length === 0" class="text-[14px] text-muted">
        {{ blockSearch.trim() ? 'Aucun bloc ne correspond à cette recherche.' : 'Aucun bloc disponible.' }}
      </p>
      <!-- Sur toute la largeur, la liste se répartit en colonnes pour rester compacte. -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 max-h-72 overflow-auto mb-4">
        <!-- Identifiants dérivés de l'identifiant du bloc : ils doivent rester uniques
             dans le document alors que la liste est construite dynamiquement. -->
        <label v-for="b in displayedBlocks" :key="b.id" :for="`user-detail-block-${b.id}`"
               class="flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors"
               :class="selectedBlockIds.includes(b.id) ? 'bg-accent/10 hover:bg-accent/15' : 'hover:bg-surface-tint'">
          <input :id="`user-detail-block-${b.id}`" type="checkbox" class="w-4 h-4 rounded accent-[#0047ab]"
                 :checked="selectedBlockIds.includes(b.id)"
                 @change="toggleBlock(b.id)"/>
          <span class="text-[14px] text-ink">{{ b.name }}</span>
        </label>
      </div>
      <div class="flex items-center justify-end gap-3">
        <span v-if="blocksDirty" class="text-[13px] text-[#b45309]">Modifications non enregistrées</span>
        <button :disabled="savingBlocks || !blocksDirty"
                class="h-10 px-5 rounded-[10px] bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                @click="saveBlocks">
          Enregistrer les blocs
        </button>
      </div>
    </div>

    <!-- Confirmation du transfert de propriété : l'action ne se défait que par le nouveau propriétaire -->
    <Modal v-if="showTransfer" @close="showTransfer = false">
      <div class="px-6 pt-6 pb-6 w-full max-w-[440px] text-center">
        <div class="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
          <Icon name="shield_person" :size="26"/>
        </div>
        <h3 class="text-[18px] font-semibold text-navy mb-2">Transférer la propriété</h3>
        <p class="text-[14px] text-ink-soft mb-4">
          <strong>{{ fullName }}</strong> deviendra propriétaire de la plateforme. Vous resterez administrateur,
          mais seul ce compte pourra vous rendre la propriété.
        </p>
        <div class="flex justify-center gap-3">
          <button
            type="button"
            class="h-10 px-4 rounded-[10px] border border-input text-ink text-sm font-semibold hover:bg-surface-tint transition-colors"
            @click="showTransfer = false"
          >
            Annuler
          </button>
          <button
            type="button"
            class="h-10 px-5 rounded-[10px] bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            @click="confirmTransfer"
          >
            Transférer
          </button>
        </div>
      </div>
    </Modal>
  </template>
</template>
