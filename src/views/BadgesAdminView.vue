<script setup>
// Espace admin : gestion du catalogue de badges. Liste tous les badges (actifs et
// inactifs), édition des valeurs ajustables (nom, description, icône, bonus XP, seuil,
// actif), et recalcul des badges d'un apprenant. La création d'un type de badge passe
// par le back (enum BadgeCode + logique d'évaluation), elle n'est donc pas proposée ici.
import {computed, onMounted, reactive, ref} from 'vue'
import {ROLES} from '@/utils/roles'
import {badgeService} from '@/services/badgeService'
import {userService} from '@/services/userService'
import Icon from '@/components/Icon.vue'
import Modal from '@/components/Modal.vue'
import {badgeIcon} from '@/utils/badgeIcons'

// Badges dont l'obtention est événementielle : le seuil y a un effet limité.
const EVENT_CODES = new Set(['PERFECT_SCORE', 'TOP_GRADE', 'EARLY_BIRD', 'NIGHT_OWL', 'COMEBACK'])

const loading = ref(true)
const error = ref('')
const message = ref('')

const badges = ref([])
const learners = ref([])

// Édition
const showEdit = ref(false)
const editing = ref(null)
const form = reactive({name: '', description: '', icon: '', xpReward: 0, thresholdValue: 1, active: true})
const formError = ref('')
const saving = ref(false)

// Recalcul
const recomputeUserId = ref('')
const recomputing = ref(false)
const recomputeMessage = ref('')

const LEVEL_STYLE = {
  BRONZE: 'bg-[#cd7f32]/15 text-[#a05a1f]',
  SILVER: 'bg-[#9ca3af]/20 text-[#5b6470]',
  GOLD: 'bg-[#f59e0b]/15 text-[#b45309]',
  PLATINUM: 'bg-[#0d9488]/15 text-[#0f766e]'
}

function levelStyle(level) {
  return LEVEL_STYLE[level] || 'bg-surface-tint text-ink-soft'
}

const isEventBadge = computed(() => editing.value && EVENT_CODES.has(editing.value.code))

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
    const [catalog, users] = await Promise.all([
      badgeService.getAllBadges(),
      userService.getUsers().catch(() => ({items: []}))
    ])
    badges.value = catalog
    learners.value = users.items.filter((u) => u.role === ROLES.USER)
  } catch (err) {
    error.value = err.message || 'Impossible de charger les badges.'
  } finally {
    loading.value = false
  }
}

function openEdit(badge) {
  editing.value = badge
  form.name = badge.name
  form.description = badge.description
  form.icon = badge.icon
  form.xpReward = badge.xpReward ?? 0
  form.thresholdValue = badge.thresholdValue ?? 1
  form.active = badge.active !== false
  formError.value = ''
  showEdit.value = true
}

async function saveEdit() {
  formError.value = ''
  if (!form.name.trim() || form.name.trim().length < 3) {
    formError.value = 'Le nom doit contenir au moins 3 caractères.'
    return
  }
  if (form.thresholdValue < 1) {
    formError.value = 'Le seuil doit être strictement positif.'
    return
  }
  saving.value = true
  try {
    const updated = await badgeService.updateBadge(editing.value.code, {
      name: form.name.trim(),
      description: form.description.trim(),
      icon: form.icon.trim(),
      xpReward: Number(form.xpReward),
      thresholdValue: Number(form.thresholdValue),
      active: form.active
    })
    const index = badges.value.findIndex((b) => b.code === updated.code)
    if (index !== -1) {
      badges.value[index] = updated
    }
    showEdit.value = false
    flashMessage(`Badge "${updated.name}" mis à jour.`)
  } catch (err) {
    formError.value = err.message || "L'enregistrement a échoué."
  } finally {
    saving.value = false
  }
}

async function recompute() {
  if (recomputeUserId.value === '') {
    return
  }
  recomputeMessage.value = ''
  recomputing.value = true
  try {
    await badgeService.recompute(recomputeUserId.value)
    const learner = learners.value.find((u) => u.id === recomputeUserId.value)
    recomputeMessage.value = `Badges recalculés pour ${learner ? `${learner.firstName} ${learner.lastName}` : "l'apprenant"}.`
  } catch (err) {
    recomputeMessage.value = err.message || 'Le recalcul a échoué.'
  } finally {
    recomputing.value = false
  }
}

onMounted(load)
</script>

<template>
  <h1 class="text-[30px] font-semibold text-navy mb-2">Badges</h1>
  <p class="text-[14px] text-muted mb-6">
    Vous pouvez ajuster les valeurs d'un badge (libellé, icône, bonus XP, seuil) et l'activer ou non.
    La création d'un nouveau type de badge se fait côté serveur, car elle requiert une logique d'obtention dédiée.
  </p>

  <p v-if="message" class="text-[14px] text-success bg-success/10 rounded-[10px] px-4 py-2.5 mb-5">{{ message }}</p>

  <div v-if="loading" class="text-[15px] text-muted py-10 text-center">Chargement des badges...</div>
  <div v-else-if="error" class="text-[15px] text-danger bg-danger/8 rounded-[10px] px-4 py-3">{{ error }}</div>

  <template v-else>
    <!-- Recalcul pour un apprenant -->
    <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-5 mb-6">
      <h2 class="text-[17px] font-semibold text-ink mb-1">Recalculer les badges d'un apprenant</h2>
      <p class="text-[13px] text-muted mb-3">Réévalue et attribue les badges mérités, utile après un ajustement de
        seuil.</p>
      <div class="flex flex-wrap items-center gap-3">
        <select v-model="recomputeUserId"
                class="h-10 px-3 border border-input rounded-[10px] text-[14px] text-ink bg-white min-w-[240px]">
          <option value="">Choisir un apprenant</option>
          <option v-for="u in learners" :key="u.id" :value="u.id">{{ u.firstName }} {{ u.lastName }}</option>
        </select>
        <button
          :disabled="recomputing || recomputeUserId === ''"
          class="h-10 px-5 rounded-[10px] bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
          @click="recompute"
        >
          <Icon name="refresh" :size="18"/>
          {{ recomputing ? 'Recalcul...' : 'Recalculer' }}
        </button>
        <span v-if="recomputeMessage" class="text-[13px] text-ink-soft">{{ recomputeMessage }}</span>
      </div>
    </div>

    <!-- Catalogue -->
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <div
        v-for="badge in badges"
        :key="badge.code"
        class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-5 flex flex-col gap-3"
        :class="{ 'opacity-60': badge.active === false }"
      >
        <div class="flex items-start gap-3">
          <div class="w-12 h-12 rounded-xl bg-accent/15 text-primary flex items-center justify-center shrink-0">
            <Icon :name="badgeIcon(badge.icon)" :size="26"/>
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-[15px] font-semibold text-ink truncate">{{ badge.name }}</h3>
            <div class="flex flex-wrap items-center gap-1.5 mt-1">
              <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                    :class="levelStyle(badge.level)">{{ badge.level }}</span>
              <span class="px-2 py-0.5 rounded-full text-[11px] bg-surface-tint text-ink-soft">{{
                  badge.category
                }}</span>
              <span v-if="badge.active === false"
                    class="px-2 py-0.5 rounded-full text-[11px] bg-surface-tint text-muted">Inactif</span>
            </div>
          </div>
          <button class="p-2 rounded-full text-ink-soft hover:bg-surface-tint transition-colors shrink-0"
                  title="Modifier" @click="openEdit(badge)">
            <Icon name="edit" :size="18"/>
          </button>
        </div>
        <p class="text-[13px] text-ink-soft line-clamp-2">{{ badge.description }}</p>
        <div class="flex items-center gap-4 text-[13px] text-muted pt-1 border-t border-line-soft">
          <span class="flex items-center gap-1"><Icon name="flag" :size="16"/> Seuil : {{ badge.thresholdValue ?? '-' }}</span>
          <span class="flex items-center gap-1"><Icon name="bolt" :size="16"/> {{ badge.xpReward ?? 0 }} XP</span>
        </div>
      </div>
    </div>
  </template>

  <!-- Modale d'édition -->
  <Modal v-if="showEdit" @close="showEdit = false">
    <div class="px-6 pt-6 pb-6 w-full max-w-[480px]">
      <h3 class="text-[20px] font-semibold text-navy mb-1">Modifier le badge</h3>
      <p class="text-[12px] text-muted mb-5">{{ editing?.code }} - {{ editing?.level }} - {{ editing?.category }}</p>

      <div class="flex flex-col gap-4">
        <div>
          <label class="block text-[13px] font-medium text-ink-soft mb-1.5">Nom</label>
          <input v-model="form.name" type="text" maxlength="100"
                 class="w-full h-10 px-3 border border-input rounded-[10px] text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"/>
        </div>
        <div>
          <label class="block text-[13px] font-medium text-ink-soft mb-1.5">Description</label>
          <textarea v-model="form.description" rows="2" maxlength="255"
                    class="w-full border border-input rounded-[10px] px-3 py-2 text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"></textarea>
        </div>
        <div>
          <label class="block text-[13px] font-medium text-ink-soft mb-1.5">Icône du badge</label>
          <div class="flex items-center gap-2">
            <span
              class="w-10 h-10 rounded-[10px] bg-surface-tint text-primary flex items-center justify-center shrink-0"><Icon
              :name="badgeIcon(form.icon)" :size="22"/></span>
            <input v-model="form.icon" type="text" maxlength="100" placeholder="ex : flame, star, rocket"
                   class="flex-1 h-10 px-3 border border-input rounded-[10px] text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"/>
          </div>
          <p class="text-[12px] text-muted mt-1.5">Code d'icône du badge (convention Lucide). L'aperçu à gauche montre
            le rendu réel.</p>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-[13px] font-medium text-ink-soft mb-1.5">Bonus XP</label>
            <input v-model.number="form.xpReward" type="number" min="0"
                   class="w-full h-10 px-3 border border-input rounded-[10px] text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"/>
          </div>
          <div>
            <label class="block text-[13px] font-medium text-ink-soft mb-1.5">Seuil</label>
            <input v-model.number="form.thresholdValue" type="number" min="1"
                   class="w-full h-10 px-3 border border-input rounded-[10px] text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"/>
          </div>
        </div>
        <p v-if="isEventBadge" class="text-[12px] text-ink-soft bg-surface-tint rounded-[10px] px-3 py-2">
          Badge événementiel : son obtention dépend d'un événement précis, le seuil y a un effet limité.
        </p>

        <label class="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" v-model="form.active" class="w-4 h-4 rounded accent-[#0047ab]"/>
          <span class="text-[14px] text-ink">Badge actif (attribuable)</span>
        </label>

        <p v-if="formError" class="text-[13px] text-danger">{{ formError }}</p>

        <div class="flex justify-end gap-3 mt-1">
          <button type="button"
                  class="h-10 px-4 rounded-[10px] border border-input text-ink text-sm font-semibold hover:bg-surface-tint transition-colors"
                  @click="showEdit = false">
            Annuler
          </button>
          <button type="button" :disabled="saving"
                  class="h-10 px-5 rounded-[10px] bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
                  @click="saveEdit">
            {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
          </button>
        </div>
      </div>
    </div>
  </Modal>
</template>
