<script setup>
// Informations personnelles et avatar.
import {onBeforeUnmount, reactive, ref} from 'vue'
import {profileService} from '@/services/profileService'
import {mapBackendError, validateEmail, validateRequired} from '@/utils/validators'
import {mediaService, MEDIA_USAGE} from '@/services/mediaService'
import {ALLOWED_IMAGE_ACCEPT, mediaUrl, validateImageFile} from '@/utils/media'
import Icon from '@/components/Icon.vue'
import {useAuthStore} from '@/stores/auth'

/*
  Une déconnexion suit ces opérations : le parent s'en charge, car c'est lui qui
  connaît la navigation. Ce composant se contente de signaler le moment.
*/
const emit = defineEmits(['reconnect'])

const auth = useAuthStore()

const infoForm = reactive({
  firstName: auth.user?.firstName || '',
  lastName: auth.user?.lastName || '',
  email: auth.user?.email || '',
  avatar: auth.user?.avatar || ''
})
const infoErrors = reactive({firstName: '', lastName: '', email: '', avatar: '', global: ''})
const infoSuccess = ref('')
const emailChanged = ref(false)
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
  // L'adresse actuelle est relevée avant l'appel : le store est mis à jour juste après,
  // la comparaison ne serait plus possible ensuite.
  const previousEmail = auth.user?.email
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

    if (previousEmail && previousEmail.toLowerCase() !== updated.email.toLowerCase()) {
      // L'adresse e-mail est un identifiant de connexion : le serveur vient de révoquer
      // toutes les sessions. On abandonne les jetons locaux immédiatement plutôt que
      // d'attendre le 401 de la prochaine requête, qui afficherait une erreur incompréhensible.
      auth.clearTokens()
      emailChanged.value = true
      infoSuccess.value = 'Adresse e-mail mise à jour. Pour des raisons de sécurité, '
          + 'toutes vos sessions ont été déconnectées.'
    } else {
      infoSuccess.value = 'Profil mis à jour avec succès.'
    }
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
</script>

<template>
  <div class="bg-surface rounded-2xl shadow-[var(--shadow-card)] p-6">
    <h3 class="text-[17px] font-semibold text-ink mb-4">Informations personnelles</h3>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
      <div>
        <label for="profile-first-name" class="block text-[13px] text-ink-soft mb-1">Prénom</label>
        <input
          id="profile-first-name"
          v-model="infoForm.firstName"
          @input="clearInfoError('firstName')"
          class="w-full h-10 px-3 border rounded-[10px] text-[15px] focus:outline-none focus:ring-1 transition-colors"
          :class="infoErrors.firstName ? 'border-danger focus:border-danger focus:ring-danger' : 'border-input focus:border-primary focus:ring-primary'"
        />
        <p v-if="infoErrors.firstName" class="text-[12px] text-danger mt-1">{{ infoErrors.firstName }}</p>
      </div>
      <div>
        <label for="profile-last-name" class="block text-[13px] text-ink-soft mb-1">Nom</label>
        <input
          id="profile-last-name"
          v-model="infoForm.lastName"
          @input="clearInfoError('lastName')"
          class="w-full h-10 px-3 border rounded-[10px] text-[15px] focus:outline-none focus:ring-1 transition-colors"
          :class="infoErrors.lastName ? 'border-danger focus:border-danger focus:ring-danger' : 'border-input focus:border-primary focus:ring-primary'"
        />
        <p v-if="infoErrors.lastName" class="text-[12px] text-danger mt-1">{{ infoErrors.lastName }}</p>
      </div>
    </div>

    <div class="mb-4">
      <label for="profile-email" class="block text-[13px] text-ink-soft mb-1">Adresse e-mail</label>
      <input
        id="profile-email"
        v-model="infoForm.email"
        @input="clearInfoError('email')"
        type="email"
        class="w-full h-10 px-3 border rounded-[10px] text-[15px] focus:outline-none focus:ring-1 transition-colors"
        :class="infoErrors.email ? 'border-danger focus:border-danger focus:ring-danger' : 'border-input focus:border-primary focus:ring-primary'"
      />
      <p v-if="infoErrors.email" class="text-[12px] text-danger mt-1">{{ infoErrors.email }}</p>
    </div>

    <div class="mb-4">
      <label for="profile-avatar" class="block text-[13px] text-ink-soft mb-1">Avatar (facultatif)</label>
      <!-- Champ fichier masqué, déclenché par le bouton ci-dessous. Il porte tout de même
           un identifiant associé à l'étiquette : le contrôle reste ainsi nommé pour les
           outils d'assistance, et l'étiquette devient cliquable pour ouvrir le sélecteur. -->
      <input
        id="profile-avatar"
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

    <div v-if="emailChanged" class="mb-4">
      <button
        type="button"
        class="h-10 px-5 rounded-[10px] bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        @click="emit('reconnect')"
      >
        Se reconnecter
      </button>
    </div>

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
</template>
