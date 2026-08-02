<script setup>
// Définition d'un nouveau mot de passe à partir du lien reçu par e-mail.
import {computed, reactive, ref} from 'vue'
import {useRoute} from 'vue-router'
import {authService} from '@/services/authService'
import {mapBackendError, validateMatch, validatePassword} from '@/utils/validators'
import Icon from '@/components/Icon.vue'
import LogoIcon from '@/components/LogoIcon.vue'

const route = useRoute()

// Le jeton est lu dans l'URL, puisque c'est ainsi que le lien de l'e-mail le transmet,
// mais il repart dans le corps de la requête : une URL se retrouve dans les journaux
// serveur, l'historique du navigateur et l'en-tête Referer.
const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))

const loading = ref(false)
const succeeded = ref(false)
const showPassword = ref(false)

const form = reactive({newPassword: '', confirmPassword: ''})
const errors = reactive({newPassword: '', confirmPassword: '', global: ''})

function clearError(field) {
  errors[field] = ''
  errors.global = ''
}

function validate() {
  errors.newPassword = validatePassword(form.newPassword)
  errors.confirmPassword = validateMatch(form.newPassword, form.confirmPassword)
  return !errors.newPassword && !errors.confirmPassword
}

async function handleSubmit() {
  errors.global = ''
  if (!validate()) {
    return
  }

  loading.value = true
  try {
    await authService.resetPassword({
      token: token.value,
      newPassword: form.newPassword,
      confirmPassword: form.confirmPassword
    })
    succeeded.value = true
  } catch (err) {
    const {fieldErrors, globalError} = mapBackendError(err, {
      knownFields: ['newPassword', 'confirmPassword']
    })
    Object.assign(errors, fieldErrors)
    // Un jeton refusé remonte en 401, que mapBackendError traduit par défaut en message
    // d'identifiants invalides. Ici il n'y a pas d'identifiants : on remplace par un
    // message qui explique la situation et propose une porte de sortie.
    errors.global = err?.status === 401
        ? "Ce lien n'est plus valide. Il a peut-être expiré ou déjà été utilisé."
        : globalError
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="bg-surface w-full max-w-[440px] rounded-2xl p-10 shadow-[var(--shadow-card)] flex flex-col items-center">
    <div class="w-15 h-15 rounded-full bg-surface-tint flex items-center justify-center mb-4 text-primary">
      <LogoIcon/>
    </div>

    <template v-if="succeeded">
      <h2 class="text-[22px] font-semibold text-navy mb-1">Mot de passe modifié</h2>
      <p class="text-[13px] text-ink-soft text-center mb-6 leading-relaxed">
        Votre mot de passe a bien été enregistré. Par sécurité, toutes vos sessions ont été
        déconnectées, y compris sur vos autres appareils.
      </p>
      <RouterLink to="/connexion"
                  class="w-full h-10 rounded-[10px] bg-primary text-white text-sm font-semibold flex items-center justify-center hover:opacity-90 transition-opacity">
        Se connecter
      </RouterLink>
    </template>

    <template v-else-if="!token">
      <h2 class="text-[22px] font-semibold text-navy mb-1">Lien incomplet</h2>
      <p class="text-[13px] text-ink-soft text-center mb-6 leading-relaxed">
        Ce lien ne contient pas de jeton de réinitialisation. Vérifiez que vous avez ouvert
        l'adresse complète, ou demandez un nouveau lien.
      </p>
      <RouterLink to="/mot-de-passe-oublie"
                  class="w-full h-10 rounded-[10px] bg-primary text-white text-sm font-semibold flex items-center justify-center hover:opacity-90 transition-opacity">
        Demander un nouveau lien
      </RouterLink>
    </template>

    <template v-else>
      <h2 class="text-[22px] font-semibold text-navy mb-1">Nouveau mot de passe</h2>
      <p class="text-[13px] text-muted mb-6 text-center">Choisissez un mot de passe solide.</p>

      <form class="w-full flex flex-col gap-5" @submit.prevent="handleSubmit" novalidate>
        <div v-if="errors.global" class="flex flex-col gap-2">
          <p class="text-[13px] text-danger bg-danger/8 rounded-[10px] px-3 py-2">{{ errors.global }}</p>
          <RouterLink to="/mot-de-passe-oublie" class="text-[13px] text-primary font-semibold hover:underline">
            Demander un nouveau lien
          </RouterLink>
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="reset-new-password" class="text-[13px] text-ink-soft font-medium">Nouveau mot de passe</label>
          <div class="relative">
            <input
              id="reset-new-password"
              v-model="form.newPassword"
              @input="clearError('newPassword')"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              placeholder="••••••••"
              class="w-full h-10 pl-10 pr-10 border rounded-[10px] text-sm text-ink outline-none transition-colors focus:border-primary"
              :class="errors.newPassword ? 'border-danger' : 'border-input'"
            />
            <Icon name="lock" :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted"/>
            <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                    :aria-label="showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
                    @click="showPassword = !showPassword">
              <Icon :name="showPassword ? 'visibility_off' : 'visibility'" :size="18"/>
            </button>
          </div>
          <p v-if="errors.newPassword" class="text-[12px] text-danger">{{ errors.newPassword }}</p>
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="reset-confirm-password" class="text-[13px] text-ink-soft font-medium">Confirmer le mot de
            passe</label>
          <div class="relative">
            <input
              id="reset-confirm-password"
              v-model="form.confirmPassword"
              @input="clearError('confirmPassword')"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              placeholder="••••••••"
              class="w-full h-10 pl-10 pr-3 border rounded-[10px] text-sm text-ink outline-none transition-colors focus:border-primary"
              :class="errors.confirmPassword ? 'border-danger' : 'border-input'"
            />
            <Icon name="lock" :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted"/>
          </div>
          <p v-if="errors.confirmPassword" class="text-[12px] text-danger">{{ errors.confirmPassword }}</p>
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full h-10 rounded-[10px] bg-primary text-white text-sm font-semibold flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {{ loading ? 'Enregistrement...' : 'Enregistrer le mot de passe' }}
        </button>

        <RouterLink to="/connexion" class="text-[13px] text-primary font-semibold hover:underline text-center">
          Retour à la connexion
        </RouterLink>
      </form>
    </template>
  </div>
</template>
