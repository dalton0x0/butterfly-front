<script setup>
// Changement de mot de passe.
import {computed, reactive, ref} from 'vue'
import {profileService} from '@/services/profileService'
import {mapBackendError, passwordStrength, validateMatch, validatePassword, validateRequired} from '@/utils/validators'
import {useAuthStore} from '@/stores/auth'

/*
  Une déconnexion suit ces opérations : le parent s'en charge, car c'est lui qui
  connaît la navigation. Ce composant se contente de signaler le moment.
*/
const emit = defineEmits(['reconnect'])

const auth = useAuthStore()

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
</script>

<template>
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
        @click="emit('reconnect')"
      >
        Se reconnecter
      </button>
    </div>

    <template v-else>
      <div class="flex flex-col gap-4 mb-4">
        <div>
          <label for="profile-current-password" class="block text-[13px] text-ink-soft mb-1">Mot de passe
            actuel</label>
          <input
            id="profile-current-password"
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
          <label for="profile-new-password" class="block text-[13px] text-ink-soft mb-1">Nouveau mot de
            passe</label>
          <input
            id="profile-new-password"
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
          <label for="profile-confirm-password" class="block text-[13px] text-ink-soft mb-1">Confirmer le
            nouveau mot de passe</label>
          <input
            id="profile-confirm-password"
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
</template>
