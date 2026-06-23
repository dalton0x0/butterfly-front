<script setup>
// Espace admin : page détail et édition d'un utilisateur.
import {ref, reactive, computed, onMounted} from 'vue'
import {useRoute} from 'vue-router'
import {userService} from '@/services/userService'
import {promotionService} from '@/services/promotionService'
import {blockService} from '@/services/blockService'
import {useAuthStore} from '@/stores/auth'
import Breadcrumb from '@/components/Breadcrumb.vue'
import Icon from '@/components/Icon.vue'
import Avatar from '@/components/Avatar.vue'
import StatusChip from '@/components/StatusChip.vue'

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

// Formulaires de chaque section
const identity = reactive({firstName: '', lastName: '', email: ''})
const selectedRole = ref('USER')
const selectedPromotionId = ref('')
const selectedBlockIds = ref([])

// Indicateurs de sauvegarde par section
const savingIdentity = ref(false)
const savingRole = ref(false)
const savingStatus = ref(false)
const savingPromotion = ref(false)
const savingBlocks = ref(false)

const ROLE_CHIP = {
  ADMIN: {label: 'Admin', variant: 'primary'},
  TEACHER: {label: 'Formateur', variant: 'primary'},
  USER: {label: 'Apprenant', variant: 'neutral'}
}
const roleChip = computed(() => ROLE_CHIP[user.value?.role] || ROLE_CHIP.USER)
const fullName = computed(() => (user.value ? `${user.value.firstName} ${user.value.lastName}` : ''))

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
    const [, promoPage, blockPage] = await Promise.all([
      loadUser(),
      promotionService.getPromotions().catch(() => ({items: []})),
      blockService.getBlocks().catch(() => ({items: []}))
    ])
    promotions.value = promoPage.items
    blocks.value = blockPage.items
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
            <span class="flex items-center gap-1.5 text-[13px]" :class="user.enabled ? 'text-[#16a34a]' : 'text-muted'">
              <span class="w-2 h-2 rounded-full" :class="user.enabled ? 'bg-[#16a34a]' : 'bg-muted'"></span>
              {{ user.enabled ? 'Actif' : 'Désactivé' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <p v-if="message" class="text-[14px] text-success bg-success/10 rounded-[10px] px-4 py-2.5 mb-5">{{ message }}</p>
    <p v-if="error" class="text-[14px] text-danger bg-danger/8 rounded-[10px] px-4 py-2.5 mb-5">{{ error }}</p>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Identité -->
      <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-6">
        <h2 class="text-[17px] font-semibold text-ink mb-4">Identité</h2>
        <div class="flex flex-col gap-3">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[12px] font-semibold text-muted uppercase tracking-wide mb-1.5">Prénom</label>
              <input v-model="identity.firstName"
                     class="w-full h-10 px-3 border border-input rounded-[10px] text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"/>
            </div>
            <div>
              <label class="block text-[12px] font-semibold text-muted uppercase tracking-wide mb-1.5">Nom</label>
              <input v-model="identity.lastName"
                     class="w-full h-10 px-3 border border-input rounded-[10px] text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"/>
            </div>
          </div>
          <div>
            <label class="block text-[12px] font-semibold text-muted uppercase tracking-wide mb-1.5">E-mail</label>
            <input v-model="identity.email" type="email"
                   class="w-full h-10 px-3 border border-input rounded-[10px] text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"/>
          </div>
          <div class="flex justify-end">
            <button :disabled="savingIdentity"
                    class="h-10 px-5 rounded-[10px] bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
                    @click="saveIdentity">
              Enregistrer
            </button>
          </div>
        </div>
      </div>

      <!-- Rôle et statut -->
      <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-6">
        <h2 class="text-[17px] font-semibold text-ink mb-4">Rôle et statut</h2>
        <div class="flex flex-col gap-4">
          <div>
            <label class="block text-[12px] font-semibold text-muted uppercase tracking-wide mb-1.5">Rôle</label>
            <div class="flex gap-2">
              <select v-model="selectedRole" :disabled="isSelf"
                      class="flex-1 h-10 px-3 border border-input rounded-[10px] text-[14px] text-ink bg-white disabled:bg-surface-tint disabled:text-muted">
                <option value="USER">Apprenant</option>
                <option value="TEACHER">Formateur</option>
                <option value="ADMIN">Admin</option>
              </select>
              <button :disabled="savingRole || isSelf || selectedRole === user.role"
                      class="h-10 px-4 rounded-[10px] bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                      @click="saveRole">
                Appliquer
              </button>
            </div>
            <p v-if="isSelf" class="text-[12px] text-muted mt-1.5">Vous ne pouvez pas modifier votre propre rôle.</p>
          </div>

          <div class="border-t border-line-soft pt-4">
            <label class="block text-[12px] font-semibold text-muted uppercase tracking-wide mb-1.5">Statut du
              compte</label>
            <button
                :disabled="savingStatus || isSelf"
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
        </div>
      </div>

      <!-- Promotion (apprenant) -->
      <div v-if="user.role === 'USER'" class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-6">
        <h2 class="text-[17px] font-semibold text-ink mb-4">Promotion</h2>
        <div class="flex gap-2">
          <select v-model="selectedPromotionId"
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

      <!-- Blocs assignés -->
      <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-6">
        <h2 class="text-[17px] font-semibold text-ink mb-1">Blocs assignés</h2>
        <p class="text-[13px] text-muted mb-4">Pour un formateur, définit sa portée pédagogique. Pour un apprenant, son
          inscription.</p>
        <p v-if="blocks.length === 0" class="text-[14px] text-muted">Aucun bloc disponible.</p>
        <div v-else class="flex flex-col gap-1 max-h-64 overflow-auto mb-4">
          <label v-for="b in blocks" :key="b.id"
                 class="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-surface-tint cursor-pointer">
            <input type="checkbox" class="w-4 h-4 rounded accent-[#0047ab]" :checked="selectedBlockIds.includes(b.id)"
                   @change="toggleBlock(b.id)"/>
            <span class="text-[14px] text-ink">{{ b.name }}</span>
          </label>
        </div>
        <div class="flex justify-end">
          <button :disabled="savingBlocks"
                  class="h-10 px-5 rounded-[10px] bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
                  @click="saveBlocks">
            Enregistrer les blocs
          </button>
        </div>
      </div>
    </div>
  </template>
</template>
