<script setup>
// Confirmation de l'adresse e-mail à partir du lien reçu par message.
import {onMounted, reactive, ref} from 'vue'
import {useRoute} from 'vue-router'
import {authService} from '@/services/authService'
import {useAuthStore} from '@/stores/auth'
import {validateEmail} from '@/utils/validators'
import Icon from '@/components/Icon.vue'
import LogoIcon from '@/components/LogoIcon.vue'

const route = useRoute()
const auth = useAuthStore()

const status = ref('verifying')

const resendForm = reactive({email: '', error: '', loading: false, submitted: false})

const token = typeof route.query.token === 'string' ? route.query.token : ''

async function verify() {
  if (!token) {
    status.value = 'missing-token'
    return
  }

  try {
    await authService.verifyEmail(token)
    status.value = 'verified'

    // Si la personne est connectée, son profil en mémoire porte encore l'ancien état :
    // sans ce rafraîchissement, le bandeau de rappel resterait affiché jusqu'au prochain
    // rechargement complet de la page.
    if (auth.isAuthenticated) {
      await auth.refreshProfile()
    }
  } catch {
    status.value = 'invalid'
  }
}

async function handleResend() {
  resendForm.error = validateEmail(resendForm.email)
  if (resendForm.error) {
    return
  }

  resendForm.loading = true
  try {
    await authService.resendVerification(resendForm.email)
    resendForm.submitted = true
  } catch (err) {
    resendForm.error = err?.message || 'Une erreur est survenue. Veuillez réessayer.'
  } finally {
    resendForm.loading = false
  }
}

onMounted(verify)
</script>

<template>
  <div class="bg-surface w-full max-w-[440px] rounded-2xl p-10 shadow-[var(--shadow-card)] flex flex-col items-center">
    <div class="w-15 h-15 rounded-full bg-surface-tint flex items-center justify-center mb-4 text-primary">
      <LogoIcon/>
    </div>

    <template v-if="status === 'verifying'">
      <h2 class="text-[22px] font-semibold text-navy mb-1">Vérification en cours</h2>
      <p class="text-[13px] text-muted text-center">Merci de patienter un instant.</p>
    </template>

    <template v-else-if="status === 'verified'">
      <h2 class="text-[22px] font-semibold text-navy mb-1">Adresse confirmée</h2>
      <p class="text-[13px] text-ink-soft text-center mb-6 leading-relaxed">
        Votre adresse e-mail est vérifiée. Votre compte pourra être récupéré en cas d'oubli
        de mot de passe.
      </p>
      <RouterLink :to="auth.isAuthenticated ? '/' : '/connexion'"
                  class="w-full h-10 rounded-[10px] bg-primary text-white text-sm font-semibold flex items-center justify-center hover:opacity-90 transition-opacity">
        {{ auth.isAuthenticated ? 'Revenir au tableau de bord' : 'Se connecter' }}
      </RouterLink>
    </template>

    <template v-else>
      <h2 class="text-[22px] font-semibold text-navy mb-1">
        {{ status === 'missing-token' ? 'Lien incomplet' : 'Lien invalide' }}
      </h2>
      <p class="text-[13px] text-ink-soft text-center mb-6 leading-relaxed">
        <template v-if="status === 'missing-token'">
          Ce lien ne contient pas de jeton de confirmation. Vérifiez que vous avez ouvert
          l'adresse complète.
        </template>
        <template v-else>
          Ce lien a expiré ou a déjà été utilisé. Indiquez votre adresse pour en recevoir un
          nouveau.
        </template>
      </p>

      <div v-if="resendForm.submitted" class="w-full">
        <p class="text-[13px] text-success bg-success/10 rounded-[10px] px-3 py-2 mb-4 text-center">
          Si un compte est associé à cette adresse et qu'elle n'est pas encore confirmée, un
          nouveau lien vient d'être envoyé.
        </p>
        <RouterLink to="/connexion"
                    class="w-full h-10 rounded-[10px] bg-primary text-white text-sm font-semibold flex items-center justify-center hover:opacity-90 transition-opacity">
          Retour à la connexion
        </RouterLink>
      </div>

      <form v-else class="w-full flex flex-col gap-4" @submit.prevent="handleResend" novalidate>
        <div class="flex flex-col gap-1.5">
          <label for="verify-resend-email" class="text-[13px] text-ink-soft font-medium">Adresse e-mail</label>
          <div class="relative">
            <input
              id="verify-resend-email"
              v-model="resendForm.email"
              @input="resendForm.error = ''"
              type="email"
              autocomplete="email"
              placeholder="vous@exemple.fr"
              class="w-full h-10 pl-10 pr-3 border rounded-[10px] text-sm text-ink outline-none transition-colors focus:border-primary"
              :class="resendForm.error ? 'border-danger' : 'border-input'"
            />
            <Icon name="mail" :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted"/>
          </div>
          <p v-if="resendForm.error" class="text-[12px] text-danger">{{ resendForm.error }}</p>
        </div>

        <button
          type="submit"
          :disabled="resendForm.loading"
          class="w-full h-10 rounded-[10px] bg-primary text-white text-sm font-semibold flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {{ resendForm.loading ? 'Envoi en cours...' : 'Recevoir un nouveau lien' }}
        </button>

        <RouterLink to="/connexion" class="text-[13px] text-primary font-semibold hover:underline text-center">
          Retour à la connexion
        </RouterLink>
      </form>
    </template>
  </div>
</template>
