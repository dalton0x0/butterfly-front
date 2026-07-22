<script setup>
// Mon profil : informations personnelles et sécurité.
import {computed, onBeforeUnmount, reactive, ref} from 'vue'
import {useRouter} from 'vue-router'
import {useAuthStore} from '@/stores/auth'
import {profileService} from '@/services/profileService'
import {
  mapBackendError,
  passwordStrength,
  validateEmail,
  validateMatch,
  validatePassword,
  validateRequired
} from '@/utils/validators'
import {mediaService, MEDIA_USAGE} from '@/services/mediaService'
import {ALLOWED_IMAGE_ACCEPT, mediaUrl, validateImageFile} from '@/utils/media'
import {tokenStorage} from '@/services/tokenStorage'
import {formatDate} from '@/utils/date'
import Icon from '@/components/Icon.vue'
import StatusChip from '@/components/StatusChip.vue'
import Breadcrumb from '@/components/Breadcrumb.vue'
import Modal from '@/components/Modal.vue'

const auth = useAuthStore()
const router = useRouter()

// Carte profil
const ROLE_LABELS = {USER: 'Apprenant', TEACHER: 'Formateur', ADMIN: 'Administrateur'}
const ROLE_VARIANTS = {USER: 'primary', TEACHER: 'success', ADMIN: 'warning'}
const roleLabel = computed(() => ROLE_LABELS[auth.user?.role] || auth.user?.role || '')
const roleVariant = computed(() => ROLE_VARIANTS[auth.user?.role] || 'neutral')
const memberSince = computed(() => {
  const raw = auth.user?.createdAt
  if (!raw) {
    return ''
  }
  const date = new Date(raw)
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('fr-FR', {month: 'long', year: 'numeric'})
})

// Informations personnelles
const infoForm = reactive({
  firstName: auth.user?.firstName || '',
  lastName: auth.user?.lastName || '',
  email: auth.user?.email || '',
  avatar: auth.user?.avatar || ''
})
const infoErrors = reactive({firstName: '', lastName: '', email: '', avatar: '', global: ''})
const infoSuccess = ref('')
const infoLoading = ref(false)

// Upload de l'avatar
const avatarInput = ref(null)
const uploadingAvatar = ref(false)
// URL d'un avatar uploadé dans cette session mais pas encore enregistré.
const pendingAvatar = ref(null)

function openAvatarPicker() {
  avatarInput.value?.click()
}

async function onAvatarSelected(event) {
  const file = (event.target.files || [])[0]
  event.target.value = ''
  if (!file) {
    return
  }
  const validationError = validateImageFile(file)
  if (validationError) {
    infoErrors.avatar = validationError
    return
  }
  infoErrors.avatar = ''
  uploadingAvatar.value = true
  try {
    const media = await mediaService.uploadImage(file, MEDIA_USAGE.AVATAR)
    // On remplace : l'ancien avatar transitoire (jamais enregistré) devient orphelin.
    if (pendingAvatar.value) {
      await mediaService.deleteMedia(pendingAvatar.value)
    }
    pendingAvatar.value = media.url
    infoForm.avatar = media.url
  } catch (err) {
    infoErrors.avatar = err.message || "L'envoi de l'avatar a échoué."
  } finally {
    uploadingAvatar.value = false
  }
}

function removeAvatar() {
  // Si l'avatar affiché est une image transitoire de cette session, on supprime son fichier.
  if (pendingAvatar.value && infoForm.avatar === pendingAvatar.value) {
    mediaService.deleteMedia(pendingAvatar.value)
    pendingAvatar.value = null
  }
  infoForm.avatar = ''
}

// Si on quitte la page avec un avatar uploadé mais jamais enregistré, on le nettoie.
onBeforeUnmount(() => {
  if (pendingAvatar.value) {
    mediaService.deleteMedia(pendingAvatar.value)
  }
})

function clearInfoError(field) {
  infoErrors[field] = ''
  infoErrors.global = ''
  infoSuccess.value = ''
}

function validateInfo() {
  infoErrors.firstName = validateRequired(infoForm.firstName, 'Le prénom est obligatoire.')
  infoErrors.lastName = validateRequired(infoForm.lastName, 'Le nom est obligatoire.')
  infoErrors.email = validateEmail(infoForm.email)
  infoErrors.avatar = ''
  return !infoErrors.firstName && !infoErrors.lastName && !infoErrors.email && !infoErrors.avatar
}

async function submitInfo() {
  infoErrors.global = ''
  infoSuccess.value = ''
  if (!validateInfo()) {
    return
  }
  infoLoading.value = true
  try {
    const updated = await profileService.updateProfile({
      firstName: infoForm.firstName,
      lastName: infoForm.lastName,
      email: infoForm.email,
      avatar: infoForm.avatar.trim() ? infoForm.avatar.trim() : null
    })
    auth.setProfile(updated)
    // L'avatar est désormais persisté (ou retiré)
    pendingAvatar.value = null
    infoSuccess.value = 'Profil mis à jour avec succès.'
  } catch (err) {
    const {fieldErrors, globalError} = mapBackendError(err, {
      knownFields: ['firstName', 'lastName', 'email', 'avatar']
    })
    Object.assign(infoErrors, fieldErrors)
    infoErrors.global = globalError
  } finally {
    infoLoading.value = false
  }
}

// Sécurité (mot de passe)
const pwdForm = reactive({currentPassword: '', newPassword: '', confirmPassword: ''})
const pwdErrors = reactive({currentPassword: '', newPassword: '', confirmPassword: '', global: ''})
const pwdLoading = ref(false)
const passwordChanged = ref(false)

const strength = computed(() => passwordStrength(pwdForm.newPassword))
const strengthColor = computed(() => {
  switch (strength.value) {
    case 1:
      return 'bg-danger'
    case 2:
      return 'bg-warning'
    case 3:
      return 'bg-primary'
    case 4:
      return 'bg-success'
    default:
      return 'bg-input'
  }
})

function clearPwdError(field) {
  pwdErrors[field] = ''
  pwdErrors.global = ''
}

function validatePwd() {
  pwdErrors.currentPassword = validateRequired(pwdForm.currentPassword, 'Le mot de passe actuel est obligatoire.')
  pwdErrors.newPassword = validatePassword(pwdForm.newPassword)
  pwdErrors.confirmPassword = validateMatch(pwdForm.newPassword, pwdForm.confirmPassword)
  // Le back refuse un nouveau mot de passe identique à l'actuel : on le vérifie aussi côté client.
  if (!pwdErrors.newPassword && pwdForm.newPassword === pwdForm.currentPassword) {
    pwdErrors.newPassword = 'Le nouveau mot de passe doit être différent du mot de passe actuel.'
  }
  return !pwdErrors.currentPassword && !pwdErrors.newPassword && !pwdErrors.confirmPassword
}

async function submitPwd() {
  pwdErrors.global = ''
  if (!validatePwd()) {
    return
  }
  pwdLoading.value = true
  try {
    await profileService.updatePassword({
      currentPassword: pwdForm.currentPassword,
      newPassword: pwdForm.newPassword,
      confirmPassword: pwdForm.confirmPassword
    })
    auth.clearTokens()
    passwordChanged.value = true
  } catch (err) {
    const {fieldErrors, globalError} = mapBackendError(err, {
      knownFields: ['currentPassword', 'newPassword', 'confirmPassword'],
      unauthorizedField: 'currentPassword'
    })
    Object.assign(pwdErrors, fieldErrors)
    pwdErrors.global = globalError
  } finally {
    pwdLoading.value = false
  }
}

// Sessions actives (appareils connectés)
const sessions = ref([])
const sessionsLoading = ref(true)
const sessionsError = ref('')
const sessionActionId = ref(null)
const revokingOthers = ref(false)
const confirmRevokeOthers = ref(false)

// Identifiant de la session courante : sert à l'étiqueter et à la protéger de la
// révocation groupée.
const currentSessionId = tokenStorage.getSessionId()

const otherSessionsCount = computed(
  () => sessions.value.filter((session) => session.id !== currentSessionId).length
)

function formatSessionDate(value) {
  return formatDate(value, {
    fallback: 'Date inconnue',
    options: {day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'}
  })
}

async function loadSessions() {
  sessionsLoading.value = true
  sessionsError.value = ''
  try {
    sessions.value = await profileService.listSessions()
  } catch (err) {
    sessionsError.value = mapBackendError(err).globalError
  } finally {
    sessionsLoading.value = false
  }
}

async function revokeSession(sessionId) {
  sessionActionId.value = sessionId
  sessionsError.value = ''
  try {
    await profileService.revokeSession(sessionId)
    // Révoquer sa propre session revient à se déconnecter de cet appareil.
    if (sessionId === currentSessionId) {
      await reconnect()
      return
    }
    await loadSessions()
  } catch (err) {
    sessionsError.value = mapBackendError(err).globalError
  } finally {
    sessionActionId.value = null
  }
}

async function revokeOtherSessions() {
  confirmRevokeOthers.value = false
  revokingOthers.value = true
  sessionsError.value = ''
  try {
    await profileService.revokeOtherSessions(currentSessionId)
    await loadSessions()
  } catch (err) {
    sessionsError.value = mapBackendError(err).globalError
  } finally {
    revokingOthers.value = false
  }
}

loadSessions()

async function reconnect() {
  await auth.logout()
  router.push({name: 'login'})
}
</script>

<template>
  <Breadcrumb :items="[{ label: 'Accueil', to: '/' }, { label: 'Mon profil' }]"/>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Carte profil -->
    <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-6 flex flex-col items-center text-center">
      <div class="w-24 h-24 rounded-full bg-surface-tint flex items-center justify-center text-primary overflow-hidden">
        <img v-if="auth.user?.avatar" :src="mediaUrl(auth.user.avatar)" alt="Avatar"
             class="w-full h-full object-cover"/>
        <Icon v-else name="account_circle" :size="64"/>
      </div>
      <h3 class="text-[17px] font-semibold text-ink mt-4">{{ auth.fullName }}</h3>
      <p class="text-[13px] text-muted">{{ auth.user?.email }}</p>
      <div class="flex gap-2 mt-3 flex-wrap justify-center">
        <StatusChip :label="roleLabel" :variant="roleVariant"/>
        <StatusChip v-if="auth.user?.promotionName" :label="auth.user.promotionName" variant="neutral"/>
      </div>
      <p v-if="memberSince" class="text-[13px] text-muted mt-3">Membre depuis {{ memberSince }}</p>
    </div>

    <!-- Colonne droite -->
    <div class="lg:col-span-2 flex flex-col gap-6">
      <!-- Informations personnelles -->
      <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-6">
        <h3 class="text-[17px] font-semibold text-ink mb-4">Informations personnelles</h3>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label class="block text-[13px] text-ink-soft mb-1">Prénom</label>
            <input
              v-model="infoForm.firstName"
              @input="clearInfoError('firstName')"
              class="w-full h-10 px-3 border rounded-[10px] text-[15px] focus:outline-none focus:ring-1 transition-colors"
              :class="infoErrors.firstName ? 'border-danger focus:border-danger focus:ring-danger' : 'border-input focus:border-primary focus:ring-primary'"
            />
            <p v-if="infoErrors.firstName" class="text-[12px] text-danger mt-1">{{ infoErrors.firstName }}</p>
          </div>
          <div>
            <label class="block text-[13px] text-ink-soft mb-1">Nom</label>
            <input
              v-model="infoForm.lastName"
              @input="clearInfoError('lastName')"
              class="w-full h-10 px-3 border rounded-[10px] text-[15px] focus:outline-none focus:ring-1 transition-colors"
              :class="infoErrors.lastName ? 'border-danger focus:border-danger focus:ring-danger' : 'border-input focus:border-primary focus:ring-primary'"
            />
            <p v-if="infoErrors.lastName" class="text-[12px] text-danger mt-1">{{ infoErrors.lastName }}</p>
          </div>
        </div>

        <div class="mb-4">
          <label class="block text-[13px] text-ink-soft mb-1">Adresse e-mail</label>
          <input
            v-model="infoForm.email"
            @input="clearInfoError('email')"
            type="email"
            class="w-full h-10 px-3 border rounded-[10px] text-[15px] focus:outline-none focus:ring-1 transition-colors"
            :class="infoErrors.email ? 'border-danger focus:border-danger focus:ring-danger' : 'border-input focus:border-primary focus:ring-primary'"
          />
          <p v-if="infoErrors.email" class="text-[12px] text-danger mt-1">{{ infoErrors.email }}</p>
        </div>

        <div class="mb-4">
          <label class="block text-[13px] text-ink-soft mb-1">Avatar (facultatif)</label>
          <input
            ref="avatarInput"
            type="file"
            :accept="ALLOWED_IMAGE_ACCEPT"
            class="hidden"
            @change="onAvatarSelected"
          />
          <div class="flex items-center gap-3">
            <div
              class="w-14 h-14 rounded-full bg-surface-tint flex items-center justify-center text-primary overflow-hidden shrink-0">
              <img v-if="infoForm.avatar" :src="mediaUrl(infoForm.avatar)" alt="Aperçu de l'avatar"
                   class="w-full h-full object-cover"/>
              <Icon v-else name="account_circle" :size="40"/>
            </div>
            <button
              type="button"
              :disabled="uploadingAvatar"
              class="h-10 px-4 rounded-[10px] border border-input text-primary text-sm font-semibold flex items-center gap-2 hover:bg-surface-tint transition-colors disabled:opacity-60"
              @click="openAvatarPicker"
            >
              <Icon name="upload" :size="16"/>
              {{ uploadingAvatar ? 'Envoi...' : "Changer l'avatar" }}
            </button>
            <button
              v-if="infoForm.avatar"
              type="button"
              class="h-10 px-3 rounded-[10px] border border-danger text-danger text-sm font-semibold hover:bg-danger/8 transition-colors"
              @click="removeAvatar"
            >
              Retirer
            </button>
          </div>
          <p class="text-[12px] text-muted mt-1">PNG, JPEG, WebP ou GIF, 5 Mo maximum.</p>
          <p v-if="infoErrors.avatar" class="text-[12px] text-danger mt-1">{{ infoErrors.avatar }}</p>
        </div>

        <p v-if="infoErrors.global" class="text-[13px] text-danger bg-danger/8 rounded-[10px] px-3 py-2 mb-4">
          {{ infoErrors.global }}</p>
        <p v-if="infoSuccess" class="text-[13px] text-success bg-success/10 rounded-[10px] px-3 py-2 mb-4">
          {{ infoSuccess }}</p>

        <div class="flex justify-end">
          <button
            type="button"
            :disabled="infoLoading"
            class="h-10 px-5 rounded-[10px] bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
            @click="submitInfo"
          >
            {{ infoLoading ? 'Enregistrement...' : 'Enregistrer les modifications' }}
          </button>
        </div>
      </div>

      <!-- Sécurité -->
      <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-6">
        <h3 class="text-[17px] font-semibold text-ink mb-4">Sécurité</h3>

        <!-- Confirmation de succès : sessions révoquées, reconnexion requise -->
        <div v-if="passwordChanged" class="flex flex-col items-start gap-3">
          <p class="text-[13px] text-success bg-success/10 rounded-[10px] px-3 py-2">
            Mot de passe mis à jour. Pour des raisons de sécurité, toutes vos sessions ont été déconnectées.
          </p>
          <button
            type="button"
            class="h-10 px-5 rounded-[10px] bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            @click="reconnect"
          >
            Se reconnecter
          </button>
        </div>

        <template v-else>
          <div class="flex flex-col gap-4 mb-4">
            <div>
              <label class="block text-[13px] text-ink-soft mb-1">Mot de passe actuel</label>
              <input
                v-model="pwdForm.currentPassword"
                @input="clearPwdError('currentPassword')"
                type="password"
                placeholder="••••••••"
                class="w-full h-10 px-3 border rounded-[10px] text-[15px] focus:outline-none focus:ring-1 transition-colors"
                :class="pwdErrors.currentPassword ? 'border-danger focus:border-danger focus:ring-danger' : 'border-input focus:border-primary focus:ring-primary'"
              />
              <p v-if="pwdErrors.currentPassword" class="text-[12px] text-danger mt-1">{{
                  pwdErrors.currentPassword
                }}</p>
            </div>

            <div>
              <label class="block text-[13px] text-ink-soft mb-1">Nouveau mot de passe</label>
              <input
                v-model="pwdForm.newPassword"
                @input="clearPwdError('newPassword')"
                type="password"
                placeholder="••••••••"
                class="w-full h-10 px-3 border rounded-[10px] text-[15px] focus:outline-none focus:ring-1 transition-colors"
                :class="pwdErrors.newPassword ? 'border-danger focus:border-danger focus:ring-danger' : 'border-input focus:border-primary focus:ring-primary'"
              />
              <div class="mt-2 flex gap-1 h-1">
                <div
                  v-for="bar in 4"
                  :key="bar"
                  class="flex-1 rounded-full transition-colors"
                  :class="bar <= strength ? strengthColor : 'bg-input'"
                ></div>
              </div>
              <p v-if="pwdErrors.newPassword" class="text-[12px] text-danger mt-1">{{ pwdErrors.newPassword }}</p>
            </div>

            <div>
              <label class="block text-[13px] text-ink-soft mb-1">Confirmer le nouveau mot de passe</label>
              <input
                v-model="pwdForm.confirmPassword"
                @input="clearPwdError('confirmPassword')"
                type="password"
                placeholder="••••••••"
                class="w-full h-10 px-3 border rounded-[10px] text-[15px] focus:outline-none focus:ring-1 transition-colors"
                :class="pwdErrors.confirmPassword ? 'border-danger focus:border-danger focus:ring-danger' : 'border-input focus:border-primary focus:ring-primary'"
              />
              <p v-if="pwdErrors.confirmPassword" class="text-[12px] text-danger mt-1">{{
                  pwdErrors.confirmPassword
                }}</p>
            </div>
          </div>

          <p class="text-[13px] text-muted mb-4">10 caractères minimum, une majuscule, une minuscule, un chiffre, un
            caractère spécial.</p>
          <p v-if="pwdErrors.global" class="text-[13px] text-danger bg-danger/8 rounded-[10px] px-3 py-2 mb-4">
            {{ pwdErrors.global }}</p>

          <div class="flex justify-end">
            <button
              type="button"
              :disabled="pwdLoading"
              class="h-10 px-5 rounded-[10px] bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
              @click="submitPwd"
            >
              {{ pwdLoading ? 'Modification...' : 'Changer le mot de passe' }}
            </button>
          </div>
        </template>
      </div>

      <!-- Sessions actives (appareils connectés) -->
      <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-6">
        <div class="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h3 class="text-[17px] font-semibold text-ink">Appareils connectés</h3>
          <button
            v-if="otherSessionsCount > 0"
            type="button"
            :disabled="revokingOthers"
            class="h-9 px-4 rounded-[10px] border border-danger text-danger text-[13px] font-semibold hover:bg-danger/8 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            @click="confirmRevokeOthers = true"
          >
            {{ revokingOthers ? 'Déconnexion...' : 'Déconnecter les autres appareils' }}
          </button>
        </div>

        <p class="text-[13px] text-muted mb-4">Chaque appareil ou navigateur connecté à votre compte
          apparaît ici. Révoquez une session pour en déconnecter l'appareil correspondant.</p>

        <p v-if="sessionsError" class="text-[13px] text-danger bg-danger/8 rounded-[10px] px-3 py-2 mb-4">
          {{ sessionsError }}</p>

        <p v-if="sessionsLoading" class="text-[13px] text-muted">Chargement des sessions...</p>

        <ul v-else class="flex flex-col gap-2">
          <li
            v-for="session in sessions"
            :key="session.id"
            class="flex items-center justify-between gap-3 border border-input rounded-[10px] px-4 py-3"
          >
            <div class="flex items-center gap-3 min-w-0">
              <Icon name="devices" :size="20" class="text-muted shrink-0"/>
              <div class="min-w-0">
                <p class="text-[14px] text-ink flex items-center gap-2 flex-wrap">
                  Session ouverte le {{ formatSessionDate(session.createdAt) }}
                  <StatusChip v-if="session.id === currentSessionId" label="Cet appareil" variant="success"/>
                </p>
                <p class="text-[12px] text-muted">Expire le {{ formatSessionDate(session.expiresAt) }}</p>
              </div>
            </div>
            <button
              type="button"
              :disabled="sessionActionId === session.id"
              class="h-9 px-4 rounded-[10px] text-[13px] font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
              :class="session.id === currentSessionId
                ? 'border border-input text-ink-soft hover:bg-surface-tint'
                : 'border border-danger text-danger hover:bg-danger/8'"
              @click="revokeSession(session.id)"
            >
              {{
                sessionActionId === session.id
                  ? '...'
                  : (session.id === currentSessionId ? 'Se déconnecter' : 'Révoquer')
              }}
            </button>
          </li>
        </ul>
      </div>
    </div>
  </div>

  <!-- Confirmation de la déconnexion des autres appareils -->
  <Modal v-if="confirmRevokeOthers" @close="confirmRevokeOthers = false">
    <div class="px-6 pt-6 pb-6">
      <h3 class="text-[20px] font-semibold text-navy mb-3">Déconnecter les autres appareils ?</h3>
      <p class="text-[14px] text-ink-soft mb-6">Toutes vos sessions seront révoquées sauf celle de cet
        appareil. Les autres appareils devront se reconnecter.</p>
      <div class="flex justify-end gap-3">
        <button
          type="button"
          class="h-10 px-5 rounded-[10px] border border-input text-ink-soft text-sm font-semibold hover:bg-surface-tint transition-colors"
          @click="confirmRevokeOthers = false"
        >
          Annuler
        </button>
        <button
          type="button"
          class="h-10 px-5 rounded-[10px] bg-danger text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          @click="revokeOtherSessions"
        >
          Déconnecter
        </button>
      </div>
    </div>
  </Modal>
</template>
